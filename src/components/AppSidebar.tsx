import { Link, useRouterState } from "@tanstack/react-router";
  import { LayoutDashboard, Plane, Search, Wrench, Cog, BookMarked, LogOut, ShieldCheck, Package, Building2, ListChecks, GitBranch, Megaphone, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const menuGroups = [
  {
    label: "Operacional",
    items: [
      { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
      { to: "/pending", label: "Pendências", icon: ListChecks },
      { to: "/demands", label: "Quadro de Avisos", icon: Megaphone },
      { to: "/timeline", label: "Histórico", icon: GitBranch },
    ]
  },
  {
    label: "Ativos & Frota",
    items: [
      { to: "/aircraft", label: "Aeronaves", icon: Plane },
      { to: "/rab", label: "Consulta RAB", icon: Search },
      { to: "/parts", label: "Peças & Estoque", icon: Cog },
      { to: "/applicability", label: "Aplicabilidade", icon: ShieldCheck },
    ]
  },
  {
    label: "Manutenção & Logística",
    items: [
      { to: "/services", label: "Ordens de Serviço", icon: Wrench },
      { to: "/service-prices", label: "Tabela de Preços", icon: DollarSign },
      { to: "/shipments", label: "Componentes Externos", icon: Package },
      { to: "/suppliers", label: "Fornecedores", icon: Building2 },
    ]
  },
  {
    label: "Sistema",
    items: [
      { to: "/library", label: "Biblioteca", icon: BookMarked },
      { to: "/admin", label: "Administrador", icon: ShieldCheck },
    ]
  }
];

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="flex h-full w-64 flex-col border-r border-white/5 bg-sidebar/40 backdrop-blur-3xl">
       <div className="flex items-center gap-4 px-6 py-8 border-b border-white/[0.03]">
         <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] group relative overflow-hidden">
           <Plane className="h-6 w-6 text-primary-foreground relative z-10" />
           <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
         </div>
         <div>
          <h1 className="font-display text-xl font-bold leading-none tracking-tight">FlightCore</h1>
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary mt-1.5 font-bold">Aviation</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-8 space-y-10 scrollbar-hide">
        {menuGroups.map((group) => (
          <div key={group.label} className="space-y-3">
            <h3 className="px-4 text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/40">
              {group.label}
            </h3>
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300",
                      active
                        ? "bg-primary/10 text-primary shadow-[inset_0_0_12px_oklch(var(--primary)/0.05)] border border-primary/10"
                        : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/[0.03] border border-transparent hover:border-white/5",
                    )}
                  >
                    <Icon className={cn("h-4.5 w-4.5 shrink-0 transition-all duration-300 group-hover:scale-110", active ? "text-primary filter drop-shadow-[0_0_8px_oklch(var(--primary)/0.4)]" : "opacity-70 group-hover:opacity-100")} />
                    <span className="truncate tracking-wide">{item.label}</span>
                    {active && (
                      <div className="ml-auto h-1 w-1 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.03] p-6 space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-sm font-bold border border-primary/20">
            {(user?.email?.[0] || "?").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-bold tracking-tight">{user?.user_metadata?.full_name || "Operador"}</p>
            <p className="truncate text-[10px] text-muted-foreground/60 font-medium">{user?.email}</p>
          </div>
        </div>
        <Button 
          onClick={signOut} 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all h-10"
        >
          <LogOut className="mr-2 h-4 w-4" /> 
          <span className="text-xs font-bold uppercase tracking-widest">Encerrar Sessão</span>
        </Button>
      </div>
    </aside>
  );
}