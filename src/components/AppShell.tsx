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
     <div className="flex min-h-screen w-full">
       <CommandMenu />
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">
        <AppSidebar />
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden animate-in slide-in-from-left duration-200">
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 lg:pl-64">
        {/* Mobile header */}
         <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-white/5 bg-background/60 backdrop-blur-xl px-4 lg:px-8">
           <div className="lg:hidden flex items-center gap-2">
             <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="hover:bg-white/5">
               {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
             </Button>
           </div>
           
           <div className="flex items-center gap-4 flex-1">
             {canGoBack ? (
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => router.navigate({ to: "/dashboard" })}
                 className="gap-2 px-3 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
               >
                 <ArrowLeft className="h-4 w-4" />
                 <span className="text-xs font-bold uppercase tracking-widest">Painel</span>
               </Button>
             ) : (
               <div className="hidden sm:flex items-center gap-2 text-muted-foreground/40">
                 <LayoutPanelLeft className="h-4 w-4" />
                 <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Visão Geral</span>
               </div>
             )}
             
             <div className="h-4 w-px bg-white/5 hidden sm:block" />

             <Button
               variant="ghost"
               size="sm"
               className="hidden sm:flex items-center gap-3 px-4 py-2 h-9 text-muted-foreground/60 bg-white/[0.03] border border-white/5 hover:bg-white/5 hover:text-foreground transition-all rounded-full group"
               onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
             >
               <Search className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
               <span className="text-xs font-medium">O que você procura?</span>
               <div className="flex items-center gap-1 opacity-40">
                 <kbd className="text-[10px] font-mono font-bold">⌘</kbd>
                 <kbd className="text-[10px] font-mono font-bold">K</kbd>
               </div>
             </Button>
           </div>

          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="font-display font-black tracking-tighter text-lg gold-text hover:opacity-80 transition-opacity">
              FlightCore
            </Link>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
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
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}