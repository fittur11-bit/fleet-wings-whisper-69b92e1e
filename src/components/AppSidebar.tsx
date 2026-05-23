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
    <aside className="flex h-full w-64 flex-col border-r border-white/5 bg-sidebar/80 backdrop-blur-xl">
       <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
         <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg">
           <Plane className="h-5 w-5 text-primary-foreground" />
         </div>
         <div>
          <h1 className="font-display text-lg font-bold leading-none tracking-tight">FlightCore</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Aviation</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scrollbar-hide">
        {menuGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-primary/10 text-primary shadow-[inset_0_0_12px_rgba(var(--primary),0.05)]"
                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/5",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", active && "text-primary")} />
                    <span className="truncate">{item.label}</span>
                    {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-semibold">
            {(user?.email?.[0] || "?").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{user?.user_metadata?.full_name || "Operador"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button onClick={signOut} variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground">
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </aside>
  );
}