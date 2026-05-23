 import * as React from "react";
 import { useNavigate } from "@tanstack/react-router";
 import { Command } from "cmdk";
 import { Plane, History, Wrench, Cog, BookMarked, Users, Settings, Search, Package, Plus, ShieldCheck } from "lucide-react";
 
 export function CommandMenu() {
   const [open, setOpen] = React.useState(false);
   const navigate = useNavigate();
 
   React.useEffect(() => {
     const down = (e: KeyboardEvent) => {
       if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
         e.preventDefault();
         setOpen((open) => !open);
       }
     };
 
     document.addEventListener("keydown", down);
     return () => document.removeEventListener("keydown", down);
   }, []);
 
   const runCommand = (command: () => void) => {
     setOpen(false);
     command();
   };
 
   if (!open) return null;
 
   return (
    <div 
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md animate-in fade-in duration-500"
      onClick={() => setOpen(false)}
    >
      <div 
        className="fixed left-1/2 top-[15%] w-[95%] max-w-[640px] -translate-x-1/2 transform animate-in zoom-in-95 slide-in-from-top-10 duration-500 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="overflow-hidden rounded-2xl border border-white/10 bg-[#080c14]/80 p-3 shadow-[0_0_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl">
          <div className="flex items-center border-b border-white/[0.05] px-4 pb-3 pt-1">
            <Search className="mr-3 h-5 w-5 text-primary/60" />
            <Command.Input 
              placeholder="O que você precisa hoje? (Ex: Registrar voo)" 
              className="w-full bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground/40 font-medium"
            />
          </div>
          <Command.List className="max-h-[420px] overflow-y-auto px-1 py-4 scrollbar-hide">
            <Command.Empty className="py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">Nenhum resultado encontrado</p>
            </Command.Empty>

            <Command.Group heading="Atalhos Rápidos" className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary/40">
              <CommandItem onSelect={() => runCommand(() => navigate({ to: "/dashboard" }))}>
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center mr-3 group-aria-selected:bg-primary/20 transition-colors">
                  <Plane className="h-4 w-4" />
                </div>
                <span className="font-bold tracking-tight">Painel de Controle</span>
                <kbd className="ml-auto text-[10px] font-mono opacity-30">ESC</kbd>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate({ to: "/aircraft" }))}>
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center mr-3 group-aria-selected:bg-primary/20 transition-colors">
                  <Plane className="h-4 w-4" />
                </div>
                <span className="font-bold tracking-tight">Frota de Aeronaves</span>
              </CommandItem>
            </Command.Group>

            <Command.Group heading="Manutenção" className="mt-4 px-3 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary/40">
              <CommandItem onSelect={() => runCommand(() => navigate({ to: "/services" }))}>
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center mr-3 group-aria-selected:bg-primary/20 transition-colors">
                  <Wrench className="h-4 w-4" />
                </div>
                <span className="font-bold tracking-tight">Ordens de Serviço</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate({ to: "/parts" }))}>
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center mr-3 group-aria-selected:bg-primary/20 transition-colors">
                  <Cog className="h-4 w-4" />
                </div>
                <span className="font-bold tracking-tight">Estoque de Componentes</span>
              </CommandItem>
            </Command.Group>

            <Command.Group heading="Operacional" className="mt-4 px-3 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary/40">
              <CommandItem onSelect={() => runCommand(() => navigate({ to: "/flight-logs" }))}>
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center mr-3 group-aria-selected:bg-primary/20 transition-colors">
                  <History className="h-4 w-4" />
                </div>
                <span className="font-bold tracking-tight">Diários de Bordo</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate({ to: "/applicability" }))}>
                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center mr-3 group-aria-selected:bg-primary/20 transition-colors">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span className="font-bold tracking-tight">Conformidade & Aplicabilidade</span>
              </CommandItem>
            </Command.Group>
          </Command.List>
          
          <div className="border-t border-white/[0.05] px-4 py-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5 opacity-40">
              <kbd className="h-5 min-w-5 rounded border border-white/20 bg-white/5 flex items-center justify-center text-[10px] font-mono">↑↓</kbd>
              <span className="text-[10px] font-bold uppercase tracking-wider">Navegar</span>
            </div>
            <div className="flex items-center gap-1.5 opacity-40">
              <kbd className="h-5 min-w-5 rounded border border-white/20 bg-white/5 flex items-center justify-center text-[10px] font-mono">ENTER</kbd>
              <span className="text-[10px] font-bold uppercase tracking-wider">Selecionar</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="group flex cursor-pointer items-center rounded-xl px-3 py-2.5 text-sm text-foreground/60 outline-none aria-selected:bg-white/[0.04] aria-selected:text-foreground hover:bg-white/[0.04] transition-all duration-200"
    >
      {children}
    </Command.Item>
  );
}