 import * as React from "react";
 import { useNavigate } from "@tanstack/react-router";
 import { Command } from "cmdk";
 import { Plane, History, Wrench, Cog, BookMarked, Users, Settings, Search, Package, Plus } from "lucide-react";
 
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
       className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
       onClick={() => setOpen(false)}
     >
       <div 
         className="fixed left-1/2 top-[20%] w-[90%] max-w-[640px] -translate-x-1/2 transform animate-in slide-in-from-top-4 duration-300"
         onClick={(e) => e.stopPropagation()}
       >
         <Command className="overflow-hidden rounded-xl border border-white/10 bg-[#0c111d]/90 p-2 shadow-2xl backdrop-blur-xl">
           <div className="flex items-center border-b border-white/5 px-3 pb-2 pt-1">
             <Search className="mr-2 h-4 w-4 text-muted-foreground" />
             <Command.Input 
               placeholder="O que você está procurando? (CMD+K)" 
               className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
             />
           </div>
           <Command.List className="max-h-[300px] overflow-y-auto px-1 py-2 scrollbar-thin">
             <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
               Nenhum resultado encontrado.
             </Command.Empty>
 
             <Command.Group heading="Navegação" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
               <CommandItem onSelect={() => runCommand(() => navigate({ to: "/dashboard" }))}>
                 <Plane className="mr-2 h-4 w-4" />
                 <span>Início</span>
               </CommandItem>
               <CommandItem onSelect={() => runCommand(() => navigate({ to: "/aircraft" }))}>
                 <Plane className="mr-2 h-4 w-4" />
                 <span>Frota</span>
               </CommandItem>
               <CommandItem onSelect={() => runCommand(() => navigate({ to: "/parts" }))}>
                 <Cog className="mr-2 h-4 w-4" />
                 <span>Estoque</span>
               </CommandItem>
               <CommandItem onSelect={() => runCommand(() => navigate({ to: "/flight-logs" }))}>
                 <History className="mr-2 h-4 w-4" />
                 <span>Diário de Bordo</span>
               </CommandItem>
               <CommandItem onSelect={() => runCommand(() => navigate({ to: "/services" }))}>
                 <Wrench className="mr-2 h-4 w-4" />
                 <span>Manutenção</span>
               </CommandItem>
             </Command.Group>
 
             <Command.Group heading="Ações Rápidas" className="mt-2 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
               <CommandItem onSelect={() => runCommand(() => navigate({ to: "/parts" }))}>
                 <Plus className="mr-2 h-4 w-4 text-emerald-400" />
                 <span>Cadastrar Peça</span>
               </CommandItem>
               <CommandItem onSelect={() => runCommand(() => navigate({ to: "/flight-logs" }))}>
                 <Plus className="mr-2 h-4 w-4 text-sky-400" />
                 <span>Registrar Voo</span>
               </CommandItem>
             </Command.Group>
 
             <Command.Group heading="Outros" className="mt-2 px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
               <CommandItem onSelect={() => runCommand(() => navigate({ to: "/suppliers" }))}>
                 <Users className="mr-2 h-4 w-4" />
                 <span>Fornecedores</span>
               </CommandItem>
               <CommandItem onSelect={() => runCommand(() => navigate({ to: "/library" }))}>
                 <BookMarked className="mr-2 h-4 w-4" />
                 <span>Biblioteca</span>
               </CommandItem>
               <CommandItem onSelect={() => runCommand(() => navigate({ to: "/backup" }))}>
                 <Settings className="mr-2 h-4 w-4" />
                 <span>Configurações & Backup</span>
               </CommandItem>
             </Command.Group>
           </Command.List>
         </Command>
       </div>
     </div>
   );
 }
 
 function CommandItem({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
   return (
     <Command.Item
       onSelect={onSelect}
       className="flex cursor-pointer items-center rounded-lg px-2 py-2 text-sm text-foreground/80 outline-none aria-selected:bg-white/5 aria-selected:text-foreground hover:bg-white/5"
     >
       {children}
     </Command.Item>
   );
 }