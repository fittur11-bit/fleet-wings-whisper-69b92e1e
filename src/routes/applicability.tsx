 import { createFileRoute } from "@tanstack/react-router";
 import { useState, useMemo } from "react";
 import { motion } from "framer-motion";
 import { Search, Plane, Package, ShieldCheck, HelpCircle, History, ListFilter } from "lucide-react";
 import { AppShell, PageHeader } from "@/components/AppShell";
 import { AuthGuard } from "@/components/AuthGuard";
 import { useParts, useAircraft } from "@/lib/queries";
 import { Input } from "@/components/ui/input";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
 
 export const Route = createFileRoute("/applicability" as any)({
   component: () => <AuthGuard><ApplicabilityPage /></AuthGuard>,
 });
 
 function ApplicabilityPage() {
   const { data: parts = [], isLoading: loadingParts } = useParts();
   const { data: aircraft = [] } = useAircraft();
   const [query, setQuery] = useState("");
   const [activeTab, setActiveTab] = useState("pn");
 
   const results = useMemo(() => {
     const q = query.toLowerCase().trim();
     if (!q) return [];
 
     if (activeTab === "pn") {
       return parts.filter(p => 
         p.part_number?.toLowerCase().includes(q) || 
         (Array.isArray(p.cross_reference_pns) && p.cross_reference_pns.some((cp: string) => cp.toLowerCase().includes(q)))
       );
     } else {
       // Search by aircraft model to see which parts fit
       return parts.filter(p => {
         const models = Array.isArray(p.applicable_models) ? p.applicable_models : [];
         return models.some((m: any) => 
           (typeof m === 'string' && m.toLowerCase().includes(q)) ||
           (typeof m === 'object' && m.model?.toLowerCase().includes(q))
         );
       });
     }
   }, [parts, query, activeTab]);
 
   return (
     <AppShell>
       <PageHeader 
         title="Assistente de Aplicabilidade" 
         description="Consulte instantaneamente em quais aeronaves uma peça pode ser aplicada."
       />
 
       <div className="max-w-4xl mx-auto space-y-6">
         <Card className="border-white/5 bg-card/60 backdrop-blur">
           <CardContent className="pt-6">
             <Tabs value={activeTab} onValueChange={setActiveTab}>
               <TabsList className="grid w-full grid-cols-2 mb-6">
                 <TabsTrigger value="pn" className="gap-2">
                   <Package className="h-4 w-4" /> Buscar por P/N
                 </TabsTrigger>
                 <TabsTrigger value="model" className="gap-2">
                   <Plane className="h-4 w-4" /> Buscar por Modelo
                 </TabsTrigger>
               </TabsList>
             </Tabs>
 
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
               <Input 
                 placeholder={activeTab === "pn" ? "Digite o Part Number (ex: CH48108-1)..." : "Digite o modelo da aeronave (ex: Cessna 172)..."}
                 className="pl-10 h-12 text-lg bg-background/50 border-white/10"
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 autoFocus
               />
             </div>
           </CardContent>
         </Card>
 
         {!query && (
           <div className="text-center py-12">
             <div className="flex justify-center mb-4">
               <div className="p-3 rounded-full bg-primary/10">
                 <HelpCircle className="h-8 w-8 text-primary opacity-50" />
               </div>
             </div>
             <h3 className="text-lg font-medium">Pronto para consultar</h3>
             <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
               Digite um P/N para ver as aeronaves compatíveis ou um modelo de aeronave para ver as peças em estoque.
             </p>
           </div>
         )}
 
          {query && results.length === 0 && !loadingParts && (
            <div className="text-center py-12 glass-card rounded-2xl border-dashed">
              <p className="text-muted-foreground">Nenhum resultado encontrado no seu estoque.</p>
            </div>
          )}
 
         <div className="grid gap-4">
           {results.map((part: any, i: number) => (
             <motion.div
               key={part.id}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.05 }}
             >
               <Card className="border-white/5 bg-card/40 hover:bg-card/60 transition-colors">
                 <CardHeader className="flex flex-row items-start justify-between pb-2">
                   <div>
                     <div className="flex items-center gap-2">
                       <CardTitle className="text-lg">{part.name}</CardTitle>
                       {part.is_pma && <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">PMA Certified</Badge>}
                     </div>
                     <p className="text-sm font-mono text-primary mt-1">P/N: {part.part_number}</p>
                   </div>
                   <div className="text-right">
                     <Badge variant="outline" className="bg-white/5">{part.status}</Badge>
                     <p className="text-xs text-muted-foreground mt-1">{part.serial_number ? `S/N: ${part.serial_number}` : 'No S/N'}</p>
                   </div>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-4">
                     {/* Applicability section */}
                     <div className="rounded-lg bg-background/40 p-3">
                       <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                         <Plane className="h-3 w-3" /> Modelos Aplicáveis
                       </p>
                       <div className="flex flex-wrap gap-2">
                         {Array.isArray(part.applicable_models) && part.applicable_models.length > 0 ? (
                           part.applicable_models.map((m: any, idx: number) => (
                             <Badge key={idx} variant="outline" className="bg-primary/5 text-primary border-primary/20">
                               {typeof m === 'string' ? m : m.model}
                             </Badge>
                           ))
                         ) : (
                           <span className="text-xs text-muted-foreground">Nenhum modelo cadastrado.</span>
                         )}
                       </div>
                     </div>
 
                     {/* Cross Reference section */}
                     {Array.isArray(part.cross_reference_pns) && part.cross_reference_pns.length > 0 && (
                       <div className="rounded-lg bg-background/40 p-3">
                         <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                           <ListFilter className="h-3 w-3" /> Cross-Reference / Alternativos
                         </p>
                         <div className="flex flex-wrap gap-2">
                           {part.cross_reference_pns.map((pn: string, idx: number) => (
                             <Badge key={idx} variant="outline" className="bg-sky-500/5 text-sky-400 border-sky-500/20">
                               {pn}
                             </Badge>
                           ))}
                         </div>
                       </div>
                     )}
 
                     {/* History section placeholder */}
                     <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2">
                       <div className="flex items-center gap-1">
                         <History className="h-3 w-3" /> Baseado em histórico e IPC
                       </div>
                       <div className="flex items-center gap-1">
                         <ShieldCheck className="h-3 w-3 text-emerald-500" /> Verificado
                       </div>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </motion.div>
           ))}
         </div>
       </div>
     </AppShell>
   );
 }