import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type Demand = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: "aog" | "high" | "normal" | "low";
  status: "open" | "in_progress" | "done" | "cancelled";
  deadline: string | null;
  aircraft_id: string | null;
  aircraft_prefix: string | null;
  assigned_to: string | null;
  location: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  resolution_notes?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  schedule_type?: string | null;
};

export const SCHEDULE_TYPES = [
  { value: "maintenance", label: "Manutenção" },
  { value: "inspection", label: "Inspeção / Vistoria" },
  { value: "flight", label: "Voo / Traslado" },
  { value: "workshop", label: "Oficina / Envio de peça" },
  { value: "other", label: "Outro" },
] as const;

export function scheduleTypeLabel(v?: string | null) {
  return SCHEDULE_TYPES.find((s) => s.value === v)?.label ?? null;
}

export function useDemands() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["demands", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demands" as any)
        .select("*")
        .order("deadline", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Demand[];
    },
    staleTime: 60 * 1000,
  });
}

export const PRIORITY_LABEL: Record<Demand["priority"], string> = {
  aog: "AOG",
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};

export const STATUS_LABEL: Record<Demand["status"], string> = {
  open: "Aberta",
  in_progress: "Em andamento",
  done: "Concluída",
  cancelled: "Cancelada",
};

export function priorityClasses(p: Demand["priority"]) {
  switch (p) {
    case "aog":
      return "bg-[#B94A48]/10 text-[#B94A48] border-[#B94A48]/20 font-bold animate-pulse";
    case "high":
      return "bg-[#C58A21]/10 text-[#C58A21] border-[#C58A21]/20 font-bold";
    case "normal":
      return "bg-[#245A7A]/10 text-[#245A7A] border-[#245A7A]/20 font-bold";
    case "low":
      return "bg-muted text-muted-foreground border-border";
  }
}