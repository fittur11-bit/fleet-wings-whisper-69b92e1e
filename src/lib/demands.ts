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
};

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
      return "bg-red-500/15 text-red-300 border-red-500/40 animate-pulse";
    case "high":
      return "bg-orange-500/15 text-orange-300 border-orange-500/30";
    case "normal":
      return "bg-sky-500/15 text-sky-300 border-sky-500/30";
    case "low":
      return "bg-muted text-muted-foreground border-white/10";
  }
}