import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Package, Search, Pencil, Trash2, Eye, ArrowDownToLine, ArrowUpFromLine, Settings2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { useParts, useAircraft } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PART_STATUS, PART_CONDITION } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";

export const Route = createFileRoute("/parts")({
  component: () => <AuthGuard><PartsPage /></AuthGuard>,
});

const statusStyles: Record<string, string> = {
  stock: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  installed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  scrapped: "bg-white/5 text-muted-foreground border-white/10",
  sent_repair: "bg-orange-500/15 text-orange-300 border-orange-500/30",
};

const conditionStyles: Record<string, string> = {
  new: "bg-emerald-500/10 text-emerald-300",
  serviceable: "bg-sky-500/10 text-sky-300",
  unserviceable: "bg-red-500/10 text-red-300",
  overhauled: "bg-violet-500/10 text-violet-300",
};

function PartsPage() {
  const { data: parts = [], isLoading } = useParts();
  const { data: aircraft = [] } = useAircraft();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [actionPart, setActionPart] = useState<any>(null);
  const [actionMode, setActionMode] = useState<"install" | "remove" | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");

  const filtered = useMemo(() => {
    return parts.filter((p: any) => {
      const matchSearch = !search ||
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.part_number?.toLowerCase().includes(search.toLowerCase()) ||
        p.serial_number?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchCond = conditionFilter === "all" || p.condition === conditionFilter;
      return matchSearch && matchStatus && matchCond;
    });
  }, [parts, search, statusFilter, conditionFilter]);

  const stats = useMemo(() => ({
    total: parts.length,
    stock: parts.filter((p: any) => p.status === "stock").length,
    installed: parts.filter((p: any) => p.status === "installed").length,
    repair: parts.filter((p: any) => p.status === "sent_repair").length,
  }), [parts]);

  const remove = async (id: string) => {
    if (!confirm("Excluir peça? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("parts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Peça excluída");
    qc.invalidateQueries({ queryKey: ["parts"] });
  };

  const openEdit = (p: any) => { setEditing(p); setOpen(true); };
  const openCreate = () => { setEditing(null); setOpen(true); };
  const openAction = (p: any, mode: "install" | "remove") => { setActionPart(p); setActionMode(mode); };

  return (
    <AppShell>
      <PageHeader
        title="Peças & Componentes"
        description="Controle de estoque, instalação e rastreabilidade"
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="bg-gradient-to-r from-primary to-[oklch(0.86_0.11_86)] text-primary-foreground shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Nova Peça
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {editing ? `Editar ${editing.name}` : "Nova Peça"}
                </DialogTitle>
              </DialogHeader>
              <PartForm initial={editing} aircraft={aircraft} onDone={() => { setOpen(false); setEditing(null); }} />
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Em Estoque", value: stats.stock, color: "text-sky-300" },
          { label: "Instaladas", value: stats.installed, color: "text-emerald-300" },
          { label: "Em Reparo", value: stats.repair, color: "text-orange-300" },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className={`mt-1 font-mono text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, P/N ou S/N..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/50 border-white/10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card/50 border-white/10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {PART_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={conditionFilter} onValueChange={setConditionFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-card/50 border-white/10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas condições</SelectItem>
            {PART_CONDITION.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="glass-card animate-pulse rounded-2xl h-20" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <Package className="mx-auto h-14 w-14 text-muted-foreground/40" />
          <h3 className="mt-4 font-display text-lg font-semibold">
            {parts.length === 0 ? "Nenhuma peça cadastrada" : "Nenhuma peça encontrada"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {parts.length === 0 ? "Adicione sua primeira peça ao estoque." : "Ajuste os filtros."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p: any, i: number) => {
            const statusLabel = PART_STATUS.find(s => s.value === p.status)?.label || p.status;
            const condLabel = PART_CONDITION.find(c => c.value === p.condition)?.label;
            const photos = Array.isArray(p.photos) ? p.photos : [];
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="glass-card glass-card-hover rounded-2xl p-4 flex items-center gap-4"
              >
                {/* Photo */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                  {photos[0] ? (
                    <img src={photos[0]} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-7 w-7 text-muted-foreground/40" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-semibold truncate">{p.name}</h3>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyles[p.status]}`}>
                      {statusLabel}
                    </span>
                    {p.condition && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${conditionStyles[p.condition]}`}>
                        {condLabel}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground font-mono">
                    {p.part_number && <span>P/N: <span className="text-foreground/80">{p.part_number}</span></span>}
                    {p.serial_number && <span>S/N: <span className="text-foreground/80">{p.serial_number}</span></span>}
                     {p.aircraft?.prefix && <span className="text-primary">{p.aircraft.prefix}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {p.status === "stock" && (
                    <Button size="sm" variant="ghost" onClick={() => openAction(p, "install")} className="text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10">
                      <ArrowDownToLine className="h-4 w-4" />
                    </Button>
                  )}
                  {p.status === "installed" && (
                    <Button size="sm" variant="ghost" onClick={() => openAction(p, "remove")} className="text-orange-300 hover:text-orange-200 hover:bg-orange-500/10">
                      <ArrowUpFromLine className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setViewing(p)}><Eye className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewing && <PartDetail part={viewing} />}
        </DialogContent>
      </Dialog>

      {/* Install/Remove dialog */}
      <Dialog open={!!actionPart} onOpenChange={(v) => !v && (setActionPart(null), setActionMode(null))}>
        <DialogContent className="max-w-md">
          {actionPart && actionMode && (
            <ActionForm
              part={actionPart}
              mode={actionMode}
              aircraft={aircraft}
              onDone={() => { setActionPart(null); setActionMode(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function PartDetail({ part }: { part: any }) {
  const photos = Array.isArray(part.photos) ? part.photos : [];
  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">{part.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-5">
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((u: string) => (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-white/10">
                <img src={u} alt="" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Status", value: PART_STATUS.find(s => s.value === part.status)?.label },
            { label: "Condição", value: PART_CONDITION.find(c => c.value === part.condition)?.label },
            { label: "Part Number", value: part.part_number },
            { label: "Serial Number", value: part.serial_number },
            { label: "Origem", value: part.origin },
            { label: "Aeronave", value: part.aircraft?.prefix },
            { label: "Instalada em", value: part.install_date },
            { label: "Removida em", value: part.removal_date },
            { label: "Horas na Instalação", value: part.hours_at_install },
          ].map((f) => (
            <div key={f.label} className="rounded-lg bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</p>
              <p className="mt-1 font-mono text-sm">{f.value || "—"}</p>
            </div>
          ))}
        </div>
        {part.notes && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Observações</p>
            <p className="text-sm bg-white/5 rounded-lg p-3 whitespace-pre-wrap">{part.notes}</p>
          </div>
        )}
      </div>
    </>
  );
}

function PartForm({ initial, aircraft, onDone }: { initial: any; aircraft: any[]; onDone: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: initial || {
      name: "", part_number: "", serial_number: "", origin: "",
      status: "stock", condition: "new", aircraft_id: null,
      install_date: "", hours_at_install: "", notes: "", photos: [],
    },
  });
  const photos = watch("photos") || [];
  const status = watch("status");

  const onSubmit = async (values: any) => {
    if (!user) return;
    const payload: any = {
      ...values,
      user_id: user.id,
      aircraft_id: values.aircraft_id || null,
      hours_at_install: values.hours_at_install ? Number(values.hours_at_install) : null,
      install_date: values.install_date || null,
      removal_date: values.removal_date || null,
      photos: values.photos || [],
    };
    const { error } = initial
      ? await supabase.from("parts").update(payload).eq("id", initial.id)
      : await supabase.from("parts").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Peça atualizada" : "Peça criada");
    qc.invalidateQueries({ queryKey: ["parts"] });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Nome da peça *</Label>
          <Input {...register("name", { required: true })} className="bg-card/50 border-white/10" />
        </div>
        <div>
          <Label>Part Number (P/N)</Label>
          <Input {...register("part_number")} className="bg-card/50 border-white/10 font-mono" />
        </div>
        <div>
          <Label>Serial Number (S/N)</Label>
          <Input {...register("serial_number")} className="bg-card/50 border-white/10 font-mono" />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={watch("status")} onValueChange={(v) => setValue("status", v)}>
            <SelectTrigger className="bg-card/50 border-white/10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PART_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Condição</Label>
          <Select value={watch("condition") || ""} onValueChange={(v) => setValue("condition", v)}>
            <SelectTrigger className="bg-card/50 border-white/10"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {PART_CONDITION.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Origem</Label>
          <Input {...register("origin")} placeholder="Ex: Fabricante, fornecedor" className="bg-card/50 border-white/10" />
        </div>
        {status === "installed" && (
          <>
            <div>
              <Label>Aeronave</Label>
              <Select value={watch("aircraft_id") || ""} onValueChange={(v) => setValue("aircraft_id", v)}>
                <SelectTrigger className="bg-card/50 border-white/10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {aircraft.map((a) => <SelectItem key={a.id} value={a.id}>{a.prefix} — {a.model}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de instalação</Label>
              <Input type="date" {...register("install_date")} className="bg-card/50 border-white/10" />
            </div>
            <div>
              <Label>Horas na instalação</Label>
              <Input type="number" step="0.1" {...register("hours_at_install")} className="bg-card/50 border-white/10 font-mono" />
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <Label>Observações</Label>
          <Textarea {...register("notes")} rows={3} className="bg-card/50 border-white/10" />
        </div>
        <div className="sm:col-span-2">
          <Label>Fotos</Label>
          <ImageUpload bucket="part-photos" value={photos} onChange={(v) => setValue("photos", v)} multiple label="Adicionar fotos" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-primary to-[oklch(0.86_0.11_86)] text-primary-foreground">
          {initial ? "Salvar" : "Criar peça"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ActionForm({ part, mode, aircraft, onDone }: { part: any; mode: "install" | "remove"; aircraft: any[]; onDone: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [aircraftId, setAircraftId] = useState<string>(part.aircraft_id || "");
  const [date, setDate] = useState(today);
  const [hours, setHours] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (mode === "install" && !aircraftId) return toast.error("Selecione uma aeronave");
    setSubmitting(true);
    const updates: any = mode === "install"
      ? { status: "installed", aircraft_id: aircraftId, install_date: date, hours_at_install: hours ? Number(hours) : null, removal_date: null }
      : { status: "stock", aircraft_id: null, removal_date: date };
    if (notes) updates.notes = (part.notes ? part.notes + "\n\n" : "") + `[${date}] ${mode === "install" ? "Instalação" : "Remoção"}: ${notes}`;
    const { error } = await supabase.from("parts").update(updates).eq("id", part.id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(mode === "install" ? "Peça instalada" : "Peça removida");
    qc.invalidateQueries({ queryKey: ["parts"] });
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-xl flex items-center gap-2">
          {mode === "install" ? <ArrowDownToLine className="h-5 w-5 text-emerald-300" /> : <ArrowUpFromLine className="h-5 w-5 text-orange-300" />}
          {mode === "install" ? "Instalar peça" : "Remover peça"}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="rounded-lg bg-white/5 p-3">
          <p className="font-semibold">{part.name}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {part.part_number && `P/N ${part.part_number}`} {part.serial_number && `· S/N ${part.serial_number}`}
          </p>
        </div>
        {mode === "install" && (
          <div>
            <Label>Aeronave *</Label>
            <Select value={aircraftId} onValueChange={setAircraftId}>
              <SelectTrigger className="bg-card/50 border-white/10"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {aircraft.map((a) => <SelectItem key={a.id} value={a.id}>{a.prefix} — {a.model}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{mode === "install" ? "Data instalação" : "Data remoção"}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-card/50 border-white/10" />
          </div>
          {mode === "install" && (
            <div>
              <Label>Horas aeronave</Label>
              <Input type="number" step="0.1" value={hours} onChange={(e) => setHours(e.target.value)} className="bg-card/50 border-white/10 font-mono" />
            </div>
          )}
        </div>
        <div>
          <Label>Observação</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" className="bg-card/50 border-white/10" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancelar</Button>
        <Button onClick={submit} disabled={submitting} className="bg-gradient-to-r from-primary to-[oklch(0.86_0.11_86)] text-primary-foreground">
          <Settings2 className="mr-2 h-4 w-4" /> Confirmar
        </Button>
      </DialogFooter>
    </>
  );
}
