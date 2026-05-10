import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Package, Trash2, Pencil, Calendar, Building2, DollarSign, Clock } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { useShipments, useAircraft } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SHIPMENT_STATUS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shipments")({
  component: () => <AuthGuard><ShipmentsPage /></AuthGuard>,
});

function ShipmentsPage() {
  const { data: shipments = [] } = useShipments();
  const { data: aircraft = [] } = useAircraft();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState<any>({
    aircraft_id: "",
    part_name: "",
    serial_number: "",
    shipping_date: format(new Date(), "yyyy-MM-dd"),
    estimated_return_date: "",
    actual_return_date: "",
    destination_workshop: "",
    budget_amount: "",
    overhaul_type: "time",
    overhaul_threshold: "",
    status: "sent",
    notes: "",
  });

  const filtered = shipments.filter((s: any) => filterStatus === "all" || s.status === filterStatus);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.aircraft_id || !form.part_name) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const payload = {
      ...form,
      user_id: user.id,
      budget_amount: form.budget_amount ? Number(form.budget_amount) : 0,
      estimated_return_date: form.estimated_return_date || null,
      actual_return_date: form.actual_return_date || null,
    };

    let error;
    if (editing) {
      const { id, ...rest } = payload;
      const res = await supabase.from("part_shipments").update(rest).eq("id", editing.id);
      error = res.error;
    } else {
      const res = await supabase.from("part_shipments").insert(payload);
      error = res.error;
    }

    if (error) return toast.error(error.message);
    toast.success(editing ? "Envio atualizado" : "Envio cadastrado");
    qc.invalidateQueries({ queryKey: ["shipments"] });
    closeDialog();
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
    setForm({
      aircraft_id: "",
      part_name: "",
      serial_number: "",
      shipping_date: format(new Date(), "yyyy-MM-dd"),
      estimated_return_date: "",
      actual_return_date: "",
      destination_workshop: "",
      budget_amount: "",
      overhaul_type: "time",
      overhaul_threshold: "",
      status: "sent",
      notes: "",
    });
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      aircraft_id: s.aircraft_id || "",
      part_name: s.part_name || "",
      serial_number: s.serial_number || "",
      shipping_date: s.shipping_date || "",
      estimated_return_date: s.estimated_return_date || "",
      actual_return_date: s.actual_return_date || "",
      destination_workshop: s.destination_workshop || "",
      budget_amount: s.budget_amount != null ? String(s.budget_amount) : "",
      overhaul_type: s.overhaul_type || "time",
      overhaul_threshold: s.overhaul_threshold || "",
      status: s.status || "sent",
      notes: s.notes || "",
    });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este registro de envio?")) return;
    const { error } = await supabase.from("part_shipments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Registro excluído");
    qc.invalidateQueries({ queryKey: ["shipments"] });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "in_repair": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "received": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "cancelled": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-slate-500/10 text-slate-500 border-slate-500/20";
    }
  };

  return (
    <AppShell>
      <PageHeader 
        title="Envio de Peças" 
        description="Controle de remessa de componentes para manutenção externa" 
        actions={
          <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
            <DialogTrigger asChild>
               <Button className="bg-primary text-primary-foreground shadow-lg">
                <Plus className="mr-2 h-4 w-4" /> Novo Envio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-sidebar/95 backdrop-blur-xl border-white/10">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{editing ? "Editar Envio" : "Novo Envio de Peça"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Aeronave *</Label>
                    <Select value={form.aircraft_id} onValueChange={(v) => setForm({ ...form, aircraft_id: v })}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder="Selecione a aeronave" />
                      </SelectTrigger>
                      <SelectContent>
                        {aircraft.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.prefix} — {a.model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIPMENT_STATUS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Peça *</Label>
                    <Input 
                      className="bg-white/5 border-white/10"
                      placeholder="Ex: Magneto, Hélice, Starter"
                      value={form.part_name} 
                      onChange={(e) => setForm({ ...form, part_name: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número de Série</Label>
                    <Input 
                      className="bg-white/5 border-white/10"
                      placeholder="S/N"
                      value={form.serial_number} 
                      onChange={(e) => setForm({ ...form, serial_number: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Envio</Label>
                    <Input 
                      type="date"
                      className="bg-white/5 border-white/10"
                      value={form.shipping_date} 
                      onChange={(e) => setForm({ ...form, shipping_date: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Previsão de Retorno</Label>
                    <Input 
                      type="date"
                      className="bg-white/5 border-white/10"
                      value={form.estimated_return_date} 
                      onChange={(e) => setForm({ ...form, estimated_return_date: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Chegada</Label>
                    <Input 
                      type="date"
                      className="bg-white/5 border-white/10"
                      value={form.actual_return_date} 
                      onChange={(e) => setForm({ ...form, actual_return_date: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Oficina / Destino</Label>
                    <Input 
                      className="bg-white/5 border-white/10"
                      placeholder="Nome da oficina ou local"
                      value={form.destination_workshop} 
                      onChange={(e) => setForm({ ...form, destination_workshop: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor do Orçamento (R$)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      className="bg-white/5 border-white/10"
                      placeholder="0,00"
                      value={form.budget_amount} 
                      onChange={(e) => setForm({ ...form, budget_amount: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="space-y-2">
                    <Label>Critério de Revisão</Label>
                    <Select value={form.overhaul_type} onValueChange={(v) => setForm({ ...form, overhaul_type: v })}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="time">Por Tempo (Meses/Anos)</SelectItem>
                        <SelectItem value="hours">Por Horas de Voo</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Intervalo/Limite</Label>
                    <Input 
                      className="bg-white/5 border-white/10"
                      placeholder="Ex: 500h ou 12 meses"
                      value={form.overhaul_threshold} 
                      onChange={(e) => setForm({ ...form, overhaul_threshold: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea 
                    className="bg-white/5 border-white/10 min-h-[100px]"
                    placeholder="Detalhes adicionais sobre o serviço..."
                    value={form.notes} 
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                  <Button type="button" variant="ghost" onClick={closeDialog}>Cancelar</Button>
                   <Button type="submit" className="bg-primary text-primary-foreground shadow-lg">
                    {editing ? "Salvar Alterações" : "Cadastrar Envio"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        } 
      />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Button 
          variant={filterStatus === "all" ? "default" : "outline"} 
          size="sm" 
          onClick={() => setFilterStatus("all")}
          className="rounded-full"
        >
          Todos
        </Button>
        {SHIPMENT_STATUS.map(s => (
          <Button 
            key={s.value}
            variant={filterStatus === s.value ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilterStatus(s.value)}
            className="rounded-full"
          >
            {s.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border-dashed border-white/10">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">Nenhum envio de peça registrado</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s: any) => (
            <div key={s.id} className="glass-card glass-card-hover rounded-2xl p-5 border border-white/5 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider", getStatusColor(s.status))}>
                      {SHIPMENT_STATUS.find(x => x.value === s.status)?.label || s.status}
                    </Badge>
                    <span className="text-[10px] font-mono font-bold text-primary">{s.aircraft?.prefix}</span>
                  </div>
                  <h3 className="font-display font-semibold text-lg line-clamp-1">{s.part_name}</h3>
                  {s.serial_number && <p className="text-xs text-muted-foreground">S/N: {s.serial_number}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-primary" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Envio: {format(parseISO(s.shipping_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                    {s.estimated_return_date && (
                      <span className="text-amber-500/80">Prev: {format(parseISO(s.estimated_return_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                    )}
                    {s.actual_return_date && (
                      <span className="text-emerald-500/80">Chegada: {format(parseISO(s.actual_return_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                    )}
                  </div>
                </div>

                {s.destination_workshop && (
                  <div className="flex items-center gap-3 text-xs">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="line-clamp-1">{s.destination_workshop}</span>
                  </div>
                )}

                {s.budget_amount > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-semibold">{Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.budget_amount)}</span>
                  </div>
                )}

                {(s.overhaul_type || s.overhaul_threshold) && (
                  <div className="flex items-center gap-3 text-xs border-t border-white/5 pt-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{s.overhaul_threshold} ({s.overhaul_type === 'hours' ? 'Horas' : 'Tempo'})</span>
                  </div>
                )}
              </div>

              {s.notes && (
                <p className="mt-4 text-xs text-muted-foreground line-clamp-2 italic bg-white/5 p-2 rounded-lg">
                  "{s.notes}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
