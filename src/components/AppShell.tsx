import { useState, type ReactNode } from "react";
 import { Menu, X, ArrowLeft, Search, LayoutPanelLeft } from "lucide-react";
import { useRouter, useRouterState, Link } from "@tanstack/react-router";
 import { AppSidebar } from "./AppSidebar";
 import { CommandMenu } from "./CommandMenu";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
   const canGoBack = pathname !== "/dashboard" && pathname !== "/dashboard/" && pathname !== "/";

    return (
      <div className="flex min-h-screen w-full selection:bg-primary/30 selection:text-primary-foreground">
        <div className="bg-mesh-gradient">
          <div className="mesh-orb-1" />
          <div className="mesh-orb-2" />
        </div>
        
        <CommandMenu />
        
        {/* Desktop Sidebar */}
        <div className="hidden lg:block fixed inset-y-0 left-0 z-30">
          <AppSidebar />
        </div>

        {/* Mobile Sidebar */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 lg:hidden animate-in slide-in-from-left duration-500 ease-out">
              <AppSidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </>
        )}

        <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
          {/* Top header */}
          <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-white/[0.05] bg-background/40 backdrop-blur-2xl px-4 lg:px-8">
            <div className="lg:hidden flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="hover:bg-white/5 rounded-full">
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
            
            <div className="flex items-center gap-4 flex-1">
              {canGoBack ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.navigate({ to: "/dashboard" })}
                  className="gap-2 px-3 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all rounded-full group"
                >
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Painel</span>
                </Button>
              ) : (
                <div className="hidden sm:flex items-center gap-2 text-primary/40">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Visão Geral</span>
                </div>
              )}
              
              <div className="h-4 w-px bg-white/10 hidden sm:block" />

              <div className="relative group hidden sm:block max-w-md flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start items-center gap-3 px-4 py-2 h-9 text-muted-foreground/60 bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 hover:text-foreground transition-all rounded-full group"
                  onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                >
                  <Search className="h-3.5 w-3.5 group-hover:scale-110 transition-transform text-primary/50" />
                  <span className="text-xs font-medium">Pesquisar aeronaves, serviços...</span>
                  <div className="ml-auto flex items-center gap-1 opacity-30 group-hover:opacity-60 transition-opacity">
                    <kbd className="text-[10px] font-mono font-bold">⌘</kbd>
                    <kbd className="text-[10px] font-mono font-bold">K</kbd>
                  </div>
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="font-display font-black tracking-tighter text-2xl gold-text hover:opacity-80 transition-all hover:scale-105 active:scale-95">
                FlightCore
              </Link>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-10 max-w-[1600px] mx-auto w-full aviation-grid">
            {children}
          </main>
        </div>
      </div>
    );
  }

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{title}</h1>
        {description && (
          <p className="max-w-2xl text-base text-muted-foreground/80 font-medium">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-700">
          {actions}
        </div>
      )}
    </div>
  );
}