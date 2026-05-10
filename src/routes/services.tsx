import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Wrench, Trash2, FileDown, Pencil } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { useServices, useAircraft } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ImageUpload";
import { SERVICE_TYPES, SERVICE_STATUS, SERVICE_CHECKLISTS } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { downloadServiceReport } from "@/lib/service-report";

export const Route = createFileRoute("/services")({
  component: () => <AuthGuard><ServicesPage /></AuthGuard>,
});

function ServicesPage() {
  const { data: services = [] } = useServices();
  const { data: aircraft = [] } = useAircraft();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [form, setForm] = useState<any>({
    aircraft_id: "", status: "pending", performed_at: "", technician: "",
    location: "", description: "", checklist: [], photos: [], repair_photos: [], cost: "",
  });

  const filtered = services.filter((s: any) => filterStatus === "all" || s.status === filterStatus);

  const toggleType = (v: string) => {
    setSelectedTypes((p) => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  };

  const buildChecklist = () => {
    const items = new Set<string>();
    selectedTypes.forEach(t => (SERVICE_CHECKLISTS[t] || []).forEach(i => items.add(i)));
    return Array.from(items).map(label => ({ label, done: false }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedTypes.length === 0) { toast.error("Selecione ao menos 1 tipo"); return; }
    const ac = aircraft.find(a => a.id === form.aircraft_id);
    const checklist = form.checklist.length ? form.checklist : buildChecklist();
    const payload: any = {
      ...form,
      user_id: user.id,
      aircraft_prefix: ac?.prefix,
      service_type: selectedTypes[0],
      service_types: selectedTypes,
      checklist,
      cost: form.cost ? Number(form.cost) : null,
      performed_at: form.performed_at || null,
    };
    let error;
    if (editing) {
      const { id, ...rest } = payload;
      const res = await supabase.from("services").update(rest).eq("id", editing.id);
      error = res.error;
    } else {
      const res = await supabase.from("services").insert(payload);
      error = res.error;
    }
    if (error) return toast.error(error.message);
    toast.success(editing ? "Serviço atualizado" : "Serviço cadastrado");
    qc.invalidateQueries({ queryKey: ["services"] });
    closeDialog();
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
    setSelectedTypes([]);
    setForm({ aircraft_id: "", status: "pending", performed_at: "", technician: "", location: "", description: "", checklist: [], photos: [], repair_photos: [], cost: "" });
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setSelectedTypes(s.service_types?.length ? s.service_types : (s.service_type ? [s.service_type] : []));
    setForm({
      aircraft_id: s.aircraft_id || "",
      status: s.status || "pending",
      performed_at: s.performed_at || "",
      technician: s.technician || "",
      location: s.location || "",
      description: s.description || "",
      checklist: s.checklist || [],
      photos: s.photos || [],
      repair_photos: s.repair_photos || [],
      cost: s.cost != null ? String(s.cost) : "",
    });
    setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir serviço?")) return;
    await supabase.from("services").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["services"] });
  };

  const emitReport = async (s: any) => {
    try {
      toast.loading("Gerando relatório...", { id: `rep-${s.id}` });
      const ac = aircraft.find((a) => a.id === s.aircraft_id);
      await downloadServiceReport(s, ac);
      toast.success("Relatório gerado", { id: `rep-${s.id}` });
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar relatório", { id: `rep-${s.id}` });
    }
  };

  return (
    <AppShell>
      <PageHeader title="Serviços" description="Manutenções e inspeções da frota" actions={
        <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
           <DialogTrigger asChild>
             <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
               <Plus className="mr-2 h-4 w-4" /> Novo Serviço
             </Button>
           </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar Serviço" : "Novo Serviço"}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <Tabs defaultValue="info">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="checklist">Checklist</TabsTrigger>
                  <TabsTrigger value="photos">Fotos</TabsTrigger>
                  <TabsTrigger value="repair">Peças/Reparo</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Aeronave *</Label>
                      <Select value={form.aircraft_id} onValueChange={(v) => setForm({...form, aircraft_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {aircraft.map(a => <SelectItem key={a.id} value={a.id}>{a.prefix} — {a.model}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{SERVICE_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Data</Label><Input type="date" value={form.performed_at} onChange={(e) => setForm({...form, performed_at: e.target.value})} /></div>
                    <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({...form, cost: e.target.value})} /></div>
                    <div><Label>Técnico</Label><Input value={form.technician} onChange={(e) => setForm({...form, technician: e.target.value})} /></div>
                    <div><Label>Local</Label><Input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} /></div>
                  </div>
                  <div>
                    <Label>Tipos de serviço (múltipla seleção) *</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto rounded-lg border border-white/10 p-3">
                      {SERVICE_TYPES.map(t => (
                        <label key={t.value} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={selectedTypes.includes(t.value)} onCheckedChange={() => toggleType(t.value)} />
                          {t.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
                </TabsContent>
                <TabsContent value="checklist" className="space-y-2 mt-4">
                  <p className="text-sm text-muted-foreground">Checklist gerado automaticamente conforme tipos selecionados.</p>
                  {buildChecklist().map((item, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 p-2 text-sm">
                      <Checkbox /> {item.label}
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="photos" className="mt-4">
                  <ImageUpload bucket="service-photos" multiple value={form.photos} onChange={(v) => setForm({...form, photos: v})} />
                </TabsContent>
                <TabsContent value="repair" className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Fotos das peças que precisam de reparo. Aparecem em seção dedicada no relatório.</p>
                  <ImageUpload bucket="part-photos" multiple value={form.repair_photos} onChange={(v) => setForm({...form, repair_photos: v})} />
                </TabsContent>
              </Tabs>
              <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                <Button type="button" variant="ghost" onClick={closeDialog}>Cancelar</Button>
                 <Button type="submit" className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">{editing ? "Salvar" : "Cadastrar"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <div className="mb-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {SERVICE_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Wrench className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">Nenhum serviço cadastrado</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((s: any) => (
            <div key={s.id} className="glass-card glass-card-hover rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-sm font-bold text-primary">{s.aircraft?.prefix || s.aircraft_prefix}</p>
                  <h3 className="font-display font-semibold mt-1">{(s.service_types || [s.service_type]).map((t: string) => SERVICE_TYPES.find(x => x.value === t)?.label || t).join(", ")}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-primary" title="Editar" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-primary" title="Emitir relatório" onClick={() => emitReport(s)}>
                    <FileDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="capitalize">{s.status}</span>
                <span>{s.performed_at ? format(parseISO(s.performed_at), "dd MMM yyyy", { locale: ptBR }) : "—"}</span>
              </div>
              {s.description && <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
              {s.photos?.length ? (
                <p className="mt-2 text-[11px] text-muted-foreground">{s.photos.length} foto(s) anexada(s)</p>
              ) : null}
              {s.repair_photos?.length ? (
                <p className="text-[11px] text-muted-foreground">{s.repair_photos.length} foto(s) de peças/reparo</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}