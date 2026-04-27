import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `Você é um assistente especialista em aviação brasileira (ANAC, RBAC, manutenção aeronáutica). Responda em português, técnico mas claro.

Contexto da frota do usuário:
${JSON.stringify(context, null, 2)}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições. Tente em instantes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    if (r.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Settings → Workspace → Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    if (!r.ok) throw new Error(`AI gateway: ${r.status}`);
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
  }
});