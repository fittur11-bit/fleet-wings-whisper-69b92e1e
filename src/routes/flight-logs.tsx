 import { createFileRoute } from "@tanstack/react-router";
 import { useState } from "react";
 import { Plus, History, Pencil, Trash2, MapPin, Fuel, Clock, User } from "lucide-react";
 import { AppShell, PageHeader } from "@/components/AppShell";
 import { AuthGuard } from "@/components/AuthGuard";
 import { useFlightLogs, useAircraft, useCrew } from "@/lib/queries";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
 import { Badge } from "@/components/ui/badge";
 import { FLIGHT_NATURE } from "@/lib/constants";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/lib/auth";
 import { useQueryClient } from "@tanstack/react-query";
 import { toast } from "sonner";
 import { format, parseISO } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
 export const Route = createFileRoute("/flight-logs")({
   component: () => <AuthGuard><FlightLogsPage /></AuthGuard>,
 });
 
 function FlightLogsPage() {
   const { data: logs = [], isLoading } = useFlightLogs();
   const { data: aircraft = [] } = useAircraft();
   const { data: crew = [] } = useCrew();
   const { user } = useAuth();
   const qc = useQueryClient();
   const [open, setOpen] = useState(false);
   const [editing, setEditing] = useState<any | null>(null);
 
   const [form, setForm] = useState<any>({
     aircraft_id: "",
     pilot_id: "",
     copilot_id: "",
     date: format(new Date(), "yyyy-MM-dd"),
     departure_airport: "",
     arrival_airport: "",
     takeoff_time: "",
     landing_time: "",
     flight_time: "",
     cycles: "1",
     fuel_burned: "",
     nature_of_flight: "private",
     notes: "",
   });
 
   const submit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!user || !form.aircraft_id || !form.flight_time) {
       toast.error("Preencha os campos obrigatórios");
       return;
     }
 
     const payload = {
       ...form,
       user_id: user.id,
       flight_time: Number(form.flight_time),
       cycles: Number(form.cycles),
       fuel_burned: form.fuel_burned ? Number(form.fuel_burned) : 0,
       pilot_id: form.pilot_id || null,
       copilot_id: form.copilot_id || null,
     };
 
     const { error } = editing 
       ? await supabase.from("flight_logs").update(payload).eq("id", editing.id)
       : await supabase.from("flight_logs").insert(payload);
 
     if (error) return toast.error(error.message);
     toast.success(editing ? "Diário atualizado" : "Voo registrado");
     qc.invalidateQueries({ queryKey: ["flight_logs"] });
     qc.invalidateQueries({ queryKey: ["aircraft"] });
     closeDialog();
   };
 
   const closeDialog = () => {
     setOpen(false);
     setEditing(null);
     setForm({
       aircraft_id: "",
       pilot_id: "",
       copilot_id: "",
       date: format(new Date(), "yyyy-MM-dd"),
       departure_airport: "",
       arrival_airport: "",
       takeoff_time: "",
       landing_time: "",
       flight_time: "",
       cycles: "1",
       fuel_burned: "",
       nature_of_flight: "private",
       notes: "",
     });
   };
 
   const remove = async (id: string) => {
     if (!confirm("Excluir este registro de voo? Isso irá estornar as horas da aeronave.")) return;
     const { error } = await supabase.from("flight_logs").delete().eq("id", id);
     if (error) return toast.error(error.message);
     toast.success("Voo excluído e horas atualizadas");
     qc.invalidateQueries({ queryKey: ["flight_logs"] });
     qc.invalidateQueries({ queryKey: ["aircraft"] });
   };
 
   return (
     <AppShell>
       <PageHeader 
         title="Diário de Bordo" 
         description="Registro de voos, horas e ciclos da frota" 
         actions={
           <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
             <DialogTrigger asChild>
               <Button className="bg-primary text-primary-foreground shadow-lg">
                 <Plus className="mr-2 h-4 w-4" /> Novo Registro
               </Button>
             </DialogTrigger>
             <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
               <DialogHeader>
                 <DialogTitle>{editing ? "Editar Voo" : "Novo Registro de Voo"}</DialogTitle>
               </DialogHeader>
               <form onSubmit={submit} className="space-y-4 pt-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Aeronave *</Label>
                     <Select value={form.aircraft_id} onValueChange={(v) => setForm({ ...form, aircraft_id: v })}>
                       <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                       <SelectContent>
                         {aircraft.map(a => <SelectItem key={a.id} value={a.id}>{a.prefix}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label>Data</Label>
                     <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                   </div>
                 </div>
 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Origem (ICAO)</Label>
                     <Input placeholder="SBSP" value={form.departure_airport} onChange={e => setForm({...form, departure_airport: e.target.value.toUpperCase()})} />
                   </div>
                   <div className="space-y-2">
                     <Label>Destino (ICAO)</Label>
                     <Input placeholder="SBJR" value={form.arrival_airport} onChange={e => setForm({...form, arrival_airport: e.target.value.toUpperCase()})} />
                   </div>
                 </div>
 
                 <div className="grid grid-cols-3 gap-4">
                   <div className="space-y-2">
                     <Label>Tempo de Voo (h) *</Label>
                     <Input type="number" step="0.1" placeholder="1.2" value={form.flight_time} onChange={e => setForm({...form, flight_time: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                     <Label>Ciclos</Label>
                     <Input type="number" value={form.cycles} onChange={e => setForm({...form, cycles: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                     <Label>Combustível (L)</Label>
                     <Input type="number" value={form.fuel_burned} onChange={e => setForm({...form, fuel_burned: e.target.value})} />
                   </div>
                 </div>
 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Comandante</Label>
                     <Select value={form.pilot_id} onValueChange={(v) => setForm({ ...form, pilot_id: v })}>
                       <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                       <SelectContent>
                         {crew.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label>Natureza</Label>
                     <Select value={form.nature_of_flight} onValueChange={(v) => setForm({ ...form, nature_of_flight: v })}>
                       <SelectTrigger><SelectValue /></SelectTrigger>
                       <SelectContent>
                         {FLIGHT_NATURE.map(n => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
 
                 <div className="space-y-2">
                   <Label>Observações</Label>
                   <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                 </div>
 
                 <div className="flex justify-end gap-2 pt-4">
                   <Button type="button" variant="ghost" onClick={closeDialog}>Cancelar</Button>
                   <Button type="submit">Salvar</Button>
                 </div>
               </form>
             </DialogContent>
           </Dialog>
         }
       />
 
       <div className="space-y-4">
         {isLoading ? (
           <div className="glass-card p-12 text-center animate-pulse">Carregando logs...</div>
         ) : logs.length === 0 ? (
           <div className="glass-card p-12 text-center border-dashed">
             <History className="mx-auto h-12 w-12 text-muted-foreground/30" />
             <p className="mt-4 text-muted-foreground">Nenhum voo registrado ainda</p>
           </div>
         ) : (
           logs.map((log: any) => (
             <div key={log.id} className="glass-card p-4 flex items-center justify-between group">
               <div className="flex items-center gap-6">
                 <div className="text-center min-w-[60px]">
                   <p className="text-xs text-muted-foreground uppercase">{format(parseISO(log.date), "MMM", {locale: ptBR})}</p>
                   <p className="text-xl font-bold">{format(parseISO(log.date), "dd")}</p>
                 </div>
                 <div className="h-10 w-[1px] bg-white/5" />
                 <div>
                   <div className="flex items-center gap-2 mb-1">
                     <Badge variant="secondary" className="font-mono text-[10px]">{log.aircraft?.prefix}</Badge>
                     <span className="text-xs text-muted-foreground flex items-center gap-1">
                       <MapPin className="h-3 w-3" /> {log.departure_airport || "???"} → {log.arrival_airport || "???"}
                     </span>
                   </div>
                   <div className="flex items-center gap-4 text-sm font-medium">
                     <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> {Number(log.flight_time).toFixed(1)}h</span>
                     <span className="flex items-center gap-1.5"><Fuel className="h-3.5 w-3.5 text-amber-500" /> {log.fuel_burned || 0}L</span>
                     <span className="flex items-center gap-1.5 text-muted-foreground text-xs"><User className="h-3.5 w-3.5" /> {log.pilot?.full_name || "Não informado"}</span>
                   </div>
                 </div>
               </div>
               <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                 <Button size="icon" variant="ghost" onClick={() => remove(log.id)} className="text-muted-foreground hover:text-destructive">
                   <Trash2 className="h-4 w-4" />
                 </Button>
               </div>
             </div>
           ))
         )}
       </div>
     </AppShell>
   );
 }