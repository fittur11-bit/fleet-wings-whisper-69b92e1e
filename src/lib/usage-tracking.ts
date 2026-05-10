import { supabase } from "@/integrations/supabase/client";

 // Estimativas de custo (USD) — Lovable Cloud
 export const COSTS = {
   STORAGE_GB_MONTH: 0.021,
   EGRESS_GB: 0.09,
   DB_ROW: 0.0000001, // praticamente zero
 };

type TrackInput = {
  event_type: "upload" | "ai_call" | "db_write";
  category: "storage" | "ai" | "database";
  bytes?: number;
  units?: number;
  estimated_cost_usd?: number;
  metadata?: Record<string, any>;
};

export async function trackUsage(input: TrackInput) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("usage_events").insert({
      user_id: user.id,
      event_type: input.event_type,
      category: input.category,
      bytes: input.bytes ?? 0,
      units: input.units ?? 1,
      estimated_cost_usd: input.estimated_cost_usd ?? 0,
      metadata: input.metadata ?? {},
    });
  } catch (e) {
    // Non-blocking: nunca quebra o fluxo principal
    console.warn("trackUsage failed:", e);
  }
}

export function bytesToGB(b: number) {
  return b / (1024 * 1024 * 1024);
}

export function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

export function fmtUSD(v: number) {
  return `US$ ${v.toFixed(v < 1 ? 4 : 2)}`;
}
