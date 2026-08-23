import { Link, useRouterState } from "@tanstack/react-router";
import { Plane, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "@/routes/__root";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { MODULES, useModuleVisibility, ADMIN_EMAILS } from "@/lib/modules";
import { NotificationBell } from "./NotificationBell";


export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: visibility = {} } = useModuleVisibility();
  const isAdmin = ADMIN_EMAILS.includes((user?.email ?? "").toLowerCase());
  const items = MODULES.filter((m) => {
    // If it's the admin module, only show it to admins
    if (m.key === "admin") return isAdmin;
    
    // For other modules, show if locked OR if visibility is true
    return ("locked" in m && m.locked) || (visibility[m.key] ?? true);
  });

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
       <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
         <div className="flex h-10 w-10 items-center justify-center rounded bg-primary">
           <Plane className="h-5 w-5 text-primary-foreground" />
         </div>
         <div>
          <div className="font-sans text-lg font-bold leading-none tracking-tight text-sidebar-foreground">FlightCore</div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-sidebar-foreground/40 mt-1">Aviation Engineering</p>
        </div>
      </div>
      
      <div className="px-6 py-2">
        <NotificationBell />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
                active
                  ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              {active && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-primary" />
              )}
              <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-sidebar-foreground/30 group-hover:text-sidebar-foreground/50")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-semibold">
            {(user?.email?.[0] || "?").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{user?.user_metadata?.full_name || "Operador"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2 mb-2">
          <Button 
            onClick={toggleTheme} 
            variant="ghost" 
            size="sm" 
            className="flex-1 justify-start text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            Modo {theme === "dark" ? "Claro" : "Escuro"}
          </Button>
        </div>
        <Button onClick={signOut} variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50">
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </aside>
  );
}