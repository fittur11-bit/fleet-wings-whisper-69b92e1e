import { LayoutDashboard, Plane, Search, Wrench, Cog, BookMarked, ShieldCheck, Package, Building2, ListChecks, GitBranch, Megaphone, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const MODULES = [
  { key: "dashboard", to: "/dashboard", label: "Painel", icon: LayoutDashboard, locked: true },
  { key: "pending", to: "/pending", label: "Pendências", icon: ListChecks },
  { key: "demands", to: "/demands", label: "Quadro de Avisos", icon: Megaphone },
  { key: "timeline", to: "/timeline", label: "Histórico", icon: GitBranch },
  { key: "aircraft", to: "/aircraft", label: "Aeronaves", icon: Plane },
  { key: "rab", to: "/rab", label: "Consulta RAB", icon: Search },
  { key: "parts", to: "/parts", label: "Peças", icon: Cog },
  { key: "applicability", to: "/applicability", label: "Aplicabilidade", icon: ShieldCheck },
  { key: "services", to: "/services", label: "Manutenção", icon: Wrench },
  { key: "service-prices", to: "/service-prices", label: "Tabela de Preços", icon: DollarSign },
  { key: "shipments", to: "/shipments", label: "Componentes Externos", icon: Package },
  { key: "suppliers", to: "/suppliers", label: "Fornecedores", icon: Building2 },
  { key: "library", to: "/library", label: "Biblioteca", icon: BookMarked },
  { key: "admin", to: "/admin", label: "Administrador", icon: ShieldCheck, locked: true },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export async function fetchModuleVisibility(): Promise<Record<string, boolean>> {
  const { data, error } = await supabase.from("module_visibility").select("module_key, visible");
  if (error) return {};
  const map: Record<string, boolean> = {};
  for (const row of data ?? []) map[row.module_key] = row.visible;
  return map;
}

export function useModuleVisibility() {
  return useQuery({
    queryKey: ["module-visibility"],
    queryFn: fetchModuleVisibility,
    staleTime: 60_000,
  });
}

export async function setModuleVisibility(moduleKey: string, visible: boolean) {
  const { error } = await supabase
    .from("module_visibility")
    .upsert({ module_key: moduleKey, visible, updated_at: new Date().toISOString() }, { onConflict: "module_key" });
  if (error) throw error;
}
