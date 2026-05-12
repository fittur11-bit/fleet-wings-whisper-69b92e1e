import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Preço estimado USD por 1M tokens (google/gemini-2.5-flash)
const PRICE_INPUT_PER_M = 0.30;
const PRICE_OUTPUT_PER_M = 2.50;

async function trackAiUsage(authHeader: string | null, usage: any, meta: Record<string, any>) {
  try {
    if (!authHeader) return;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return;
    const inputTokens = usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;
    const totalTokens = usage?.total_tokens ?? inputTokens + outputTokens;
    const cost =
      (inputTokens / 1_000_000) * PRICE_INPUT_PER_M +
      (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    await admin.from("usage_events").insert({
      user_id: user.id,
      event_type: "ai_call",
      category: "ai",
      units: totalTokens,
      estimated_cost_usd: cost,
      metadata: { ...meta, input_tokens: inputTokens, output_tokens: outputTokens, model: "google/gemini-2.5-flash" },
    });
  } catch (e) {
    console.warn("trackAiUsage failed:", e);
  }
}

const SCHEMA_PROMPT = `Você é um extrator de dados do Registro Aeronáutico Brasileiro (RAB / ANAC).
Analise o conteúdo fornecido (texto de página HTML, PDF ou imagem do certificado/consulta RAB) e extraia
os campos da aeronave. Responda APENAS com JSON válido no formato:
{
  "prefix": "PT-XXX",
  "manufacturer": "...",
  "model": "...",
  "serial_number": "...",
  "year": 1234,
  "owner": "...",
  "cva_expiration": "YYYY-MM-DD",
  "notes": "Outros dados relevantes encontrados (categoria, motor, classificação, etc)"
}
Use null para campos não encontrados. Não invente dados.`;

async function fetchUrlAsText(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 FleetControl/1.0" },
  });
  if (!r.ok) throw new Error(`Falha ao baixar URL: ${r.status}`);
  const html = await r.text();
  // Strip scripts/styles e tags para reduzir tokens
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 18000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    const authHeader = req.headers.get("Authorization");

    const body = await req.json();
    const { url, fileUrl, fileType } = body as { url?: string; fileUrl?: string; fileType?: string };

    let userContent: any;
    if (url) {
      const text = await fetchUrlAsText(url);
      userContent = `Fonte: ${url}\n\nConteúdo extraído da página:\n${text}`;
    } else if (fileUrl) {
      const isImage = (fileType || "").startsWith("image/");
      if (isImage) {
        userContent = [
          { type: "text", text: "Extraia os dados da aeronave desta imagem do RAB." },
          { type: "image_url", image_url: { url: fileUrl } },
        ];
      } else {
        // PDF: baixar e enviar como image_url base64 (gemini aceita) — fallback simples: enviar URL
        userContent = [
          { type: "text", text: "Extraia os dados da aeronave deste documento RAB." },
          { type: "image_url", image_url: { url: fileUrl } },
        ];
      }
    } else {
      throw new Error("Forneça url ou fileUrl");
    }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SCHEMA_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (r.status === 429)
      return new Response(JSON.stringify({ error: "Limite de requisições. Tente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402)
      return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`AI gateway: ${r.status} ${t}`);
    }
    const data = await r.json();
    await trackAiUsage(authHeader, data.usage, { fn: "rab-extract", source: url ? "url" : "file" });
    const raw = data.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    return new Response(JSON.stringify({ data: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});