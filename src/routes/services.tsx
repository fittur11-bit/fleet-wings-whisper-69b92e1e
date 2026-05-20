import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Wrench, Trash2, FileDown, Pencil, Eye, ImageIcon } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { useServices, useAircraft, useSuppliers } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ImageUpload";
import { SERVICE_TYPES, SERVICE_STATUS } from "@/lib/constants";
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
  const { data: suppliers = [] } = useSuppliers();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [form, setForm] = useState<any>({
    aircraft_id: "", supplier_id: "", status: "pending", performed_at: "", technician: "",
    location: "", description: "", checklist: [], photos: [], repair_photos: [], cost: "",
  });

  const filtered = services.filter((s: any) => filterStatus === "all" || s.status === filterStatus);

  const toggleType = (v: string) => {
    setSelectedTypes((p) => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  };


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || selectedTypes.length === 0) { toast.error("Selecione ao menos 1 tipo"); return; }
    const ac = aircraft.find(a => a.id === form.aircraft_id);
    const payload: any = {
      ...form,
      user_id: user.id,
      aircraft_prefix: ac?.prefix,
      service_type: selectedTypes[0],
      service_types: selectedTypes,
      cost: form.cost ? Number(form.cost) : null,
      performed_at: form.performed_at || null,
      supplier_id: form.supplier_id || null,
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
    // Sync supplier_id to linked maintenance_items (same aircraft + matching item_type)
    if (payload.supplier_id && payload.aircraft_id && selectedTypes.length) {
      const { error: mxErr } = await supabase
        .from("maintenance_items")
        .update({ supplier_id: payload.supplier_id })
        .eq("aircraft_id", payload.aircraft_id)
        .in("item_type", selectedTypes);
      if (mxErr) toast.warning("Serviço salvo, mas falhou ao vincular manutenções: " + mxErr.message);
      else qc.invalidateQueries({ queryKey: ["maintenance_items"] });
    }
    toast.success(editing ? "Serviço atualizado" : "Serviço cadastrado");
    qc.invalidateQueries({ queryKey: ["services"] });
    closeDialog();
  };

  const closeDialog = () => {
    setOpen(false);
    setEditing(null);
    setSelectedTypes([]);
    setForm({ aircraft_id: "", supplier_id: "", status: "pending", performed_at: "", technician: "", location: "", description: "", photos: [], repair_photos: [], cost: "" });
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setSelectedTypes(s.service_types?.length ? s.service_types : (s.service_type ? [s.service_type] : []));
    setForm({
      aircraft_id: s.aircraft_id || "",
      supplier_id: s.supplier_id || "",
      status: s.status || "pending",
      performed_at: s.performed_at || "",
      technician: s.technician || "",
      location: s.location || "",
      description: s.description || "",
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Informações</TabsTrigger>
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
                    <div className="col-span-2">
                      <Label>Fornecedor / Oficina (opcional)</Label>
                      <Select value={form.supplier_id || "none"} onValueChange={(v) => setForm({...form, supplier_id: v === "none" ? "" : v})}>
                        <SelectTrigger><SelectValue placeholder="Selecione um fornecedor..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {suppliers.map((sp: any) => (
                            <SelectItem key={sp.id} value={sp.id}>
                              {sp.preferred ? "⭐ " : ""}{sp.name}{sp.city ? ` — ${sp.city}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {suppliers.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Nenhum fornecedor cadastrado. Cadastre em Fornecedores.</p>
                      )}
                    </div>
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
                  <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-primary" title="Visualizar" onClick={() => setViewing(s)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
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
              {s.supplier_id && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Executado por: <span className="text-foreground">{suppliers.find((sp: any) => sp.id === s.supplier_id)?.name || "—"}</span>
                </p>
              )}
              <div className="mt-3 flex gap-2">
                {s.photos?.length ? (
                  <div className="flex -space-x-2 overflow-hidden">
                    {s.photos.slice(0, 3).map((url: string, i: number) => (
                      <img 
                        key={i} 
                        src={url} 
                        alt="" 
                        className="inline-block h-8 w-8 rounded-full ring-2 ring-background object-cover" 
                      />
                    ))}
                    {s.photos.length > 3 && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
                        +{s.photos.length - 3}
                      </div>
                    )}
                  </div>
                ) : null}
                {s.repair_photos?.length ? (
                  <div className="flex -space-x-2 overflow-hidden">
                    {s.repair_photos.slice(0, 3).map((url: string, i: number) => (
                      <img 
                        key={i} 
                        src={url} 
                        alt="" 
                        className="inline-block h-8 w-8 rounded-full ring-2 ring-background border-2 border-destructive/30 object-cover" 
                      />
                    ))}
                    {s.repair_photos.length > 3 && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-[10px] font-medium ring-2 ring-background text-destructive">
                        +{s.repair_photos.length - 3}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {viewing && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                  <Wrench className="h-6 w-6 text-primary" />
                  Detalhes do Serviço
                </DialogTitle>
                <p className="text-muted-foreground">
                  {viewing.aircraft?.prefix || viewing.aircraft_prefix} — {viewing.performed_at ? format(parseISO(viewing.performed_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Data não informada"}
                </p>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="glass-card p-4 rounded-xl space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-primary">Informações Gerais</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium capitalize">{viewing.status}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Custo</p>
                        <p className="font-medium">{viewing.cost ? `R$ ${viewing.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Técnico</p>
                        <p className="font-medium">{viewing.technician || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Local</p>
                        <p className="font-medium">{viewing.location || "—"}</p>
                      </div>
                    </div>
                    {viewing.supplier_id && (
                      <div className="pt-2 border-t border-white/5">
                        <p className="text-muted-foreground text-xs uppercase tracking-wider">Oficina / Fornecedor</p>
                        <p className="font-medium">{suppliers.find((sp: any) => sp.id === viewing.supplier_id)?.name || "—"}</p>
                      </div>
                    )}
                  </div>

                  <div className="glass-card p-4 rounded-xl space-y-3">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-primary">Descrição</h4>
                    <p className="text-sm whitespace-pre-wrap">{viewing.description || "Nenhuma descrição fornecida."}</p>
                  </div>

                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-primary flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Fotos do Serviço
                  </h4>
                  {viewing.photos?.length ? (
                    <div className="grid grid-cols-2 gap-2">
                      {viewing.photos.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-lg border border-white/10 hover:ring-2 ring-primary transition-all">
                          <img src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-xs">Nenhuma foto anexada</p>
                    </div>
                  )}

                  {viewing.repair_photos?.length > 0 && (
                    <>
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-destructive flex items-center gap-2 mt-4">
                        <ImageIcon className="h-4 w-4" />
                        Fotos de Reparo / Peças
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {viewing.repair_photos.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-lg border border-white/10 hover:ring-2 ring-destructive transition-all">
                            <img src={url} alt={`Reparo ${i + 1}`} className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}