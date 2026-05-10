import { Link, useRouterState } from "@tanstack/react-router";
 import { LayoutDashboard, Plane, Search, Wrench, Cog, BookMarked, Sparkles, LogOut, ShieldCheck, BarChart3, Archive, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const items = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/aircraft", label: "Aeronaves", icon: Plane },
  { to: "/rab", label: "Consulta RAB", icon: Search },
   { to: "/parts", label: "Peças", icon: Cog },
   { to: "/services", label: "Serviços", icon: Wrench },
   { to: "/shipments", label: "Envio de Peças", icon: Package },
   { to: "/library", label: "Biblioteca", icon: BookMarked },
  { to: "/assistant", label: "Assistente IA", icon: Sparkles },
  { to: "/usage", label: "Custos e Uso", icon: BarChart3 },
  { to: "/backup", label: "Backup & Limpeza", icon: Archive },
] as const;

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="flex h-full w-64 flex-col border-r border-white/5 bg-sidebar/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.74_0.142_78)] to-[oklch(0.86_0.11_86)] shadow-lg">
          <ShieldCheck className="h-5 w-5 text-[oklch(0.16_0.04_255)]" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold leading-none tracking-tight">FleetControl</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">Aviation</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-2 border-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/5",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-primary")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
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