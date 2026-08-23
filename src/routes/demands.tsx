import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { 
  Plus, 
  Megaphone, 
  Trash2, 
  Pencil, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Siren, 
  Calendar as CalendarIcon, 
  List, 
  CalendarDays,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { 
  useDemands, 
  PRIORITY_LABEL, 
  STATUS_LABEL, 
  priorityClasses, 
  type Demand,
  SCHEDULE_TYPES,
  scheduleTypeLabel
} from "@/lib/demands";
import { useAircraft } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  differenceInHours, 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isSameMonth
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/demands")({
  component: () => <AuthGuard><DemandsPage /></AuthGuard>,
});

const emptyForm = {
  title: "",
  description: "",
  priority: "normal" as Demand["priority"],
  status: "open" as Demand["status"],
  deadline: "",
  aircraft_id: "",
  assigned_to: "",
  location: "",
  resolution_notes: "",
  scheduled_start: "",
  scheduled_end: "",
  schedule_type: "" as string,
};

function DemandsPage() {
  const { data: demands = [], refetch } = useDemands();
  const { data: aircraft = [] } = useAircraft();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Demand | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [filter, setFilter] = useState<"active" | "all" | "done">("active");
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolving, setResolving] = useState<Demand | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Alert about urgent demands once on load
  useEffect(() => {
    if (!demands.length) return;
    const now = new Date();
    const aog = demands.filter((d) => d.status !== "done" && d.status !== "cancelled" && d.priority === "aog");
    const urgent = demands.filter((d) => {
      if (d.status === "done" || d.status === "cancelled" || !d.deadline) return false;
      const h = differenceInHours(parseISO(d.deadline), now);
      return h <= 24;
    });
    if (aog.length) {
      toast.error(`${aog.length} demanda(s) AOG ativa(s)!`, { duration: 6000, icon: "🚨" });
    } else if (urgent.length) {
      toast.warning(`${urgent.length} demanda(s) com prazo em até 24h`, { duration: 5000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demands.length]);

  const filtered = useMemo(() => {
    if (filter === "all") return demands;
    if (filter === "done") return demands.filter((d) => d.status === "done" || d.status === "cancelled");
    return demands.filter((d) => d.status === "open" || d.status === "in_progress");
  }, [demands, filter]);

  const counts = useMemo(() => {
    const now = new Date();
    const active = demands.filter((d) => d.status === "open" || d.status === "in_progress");
    const aog = active.filter((d) => d.priority === "aog").length;
    const overdue = active.filter((d) => d.deadline && parseISO(d.deadline) < now).length;
    const soon = active.filter((d) => {
      if (!d.deadline) return false;
      const h = differenceInHours(parseISO(d.deadline), now);
      return h >= 0 && h <= 24;
    }).length;
    return { active: active.length, aog, overdue, soon };
  }, [demands]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (d: Demand) => {
    setEditing(d);
    setForm({
      title: d.title,
      description: d.description || "",
      priority: d.priority,
      status: d.status,
      deadline: d.deadline ? d.deadline.slice(0, 16) : "",
      aircraft_id: d.aircraft_id || "",
      assigned_to: d.assigned_to || "",
      location: d.location || "",
      resolution_notes: d.resolution_notes || "",
      scheduled_start: d.scheduled_start ? d.scheduled_start.slice(0, 16) : "",
      scheduled_end: d.scheduled_end ? d.scheduled_end.slice(0, 16) : "",
      schedule_type: d.schedule_type || "",
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title.trim()) { toast.error("Informe o título"); return; }
    const ac = aircraft.find((a: any) => a.id === form.aircraft_id);
    const payload: any = {
      title: form.title.trim(),
      description: form.description || null,
      priority: form.priority,
      status: form.status,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      aircraft_id: form.aircraft_id || null,
      aircraft_prefix: ac?.prefix || null,
      assigned_to: form.assigned_to || null,
      location: form.location || null,
      user_id: user.id,
      completed_at: form.status === "done" ? new Date().toISOString() : null,
      resolution_notes: form.resolution_notes?.trim() || null,
      scheduled_start: form.scheduled_start ? new Date(form.scheduled_start).toISOString() : null,
      scheduled_end: form.scheduled_end ? new Date(form.scheduled_end).toISOString() : null,
      schedule_type: form.schedule_type || null,
    };
    const { error } = editing
      ? await supabase.from("demands" as any).update(payload).eq("id", editing.id)
      : await supabase.from("demands" as any).insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Demanda atualizada" : "Demanda criada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["demands"] });
    refetch();
  };

  const quickStatus = async (d: Demand, status: Demand["status"]) => {
    if (status === "done") {
      setResolving(d);
      setResolutionText(d.resolution_notes || "");
      setResolveOpen(true);
      return;
    }
    const payload: any = { status, completed_at: null };
    const { error } = await supabase.from("demands" as any).update(payload).eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["demands"] });
    refetch();
  };

  const confirmResolve = async () => {
    if (!resolving) return;
    const payload: any = {
      status: "done",
      completed_at: new Date().toISOString(),
      resolution_notes: resolutionText.trim() || null,
    };
    const { error } = await supabase.from("demands" as any).update(payload).eq("id", resolving.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Aviso concluído e informações salvas");
    setResolveOpen(false);
    setResolving(null);
    setResolutionText("");
    qc.invalidateQueries({ queryKey: ["demands"] });
    refetch();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta demanda?")) return;
    const { error } = await supabase.from("demands" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluída");
    qc.invalidateQueries({ queryKey: ["demands"] });
    refetch();
  };

  return (
    <AppShell>
      <PageHeader
        title="Quadro de Avisos"
        description="Demandas, AOG e prazos para acompanhar."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 mr-2">
              <Button 
                variant={view === "list" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={() => setView("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant={view === "calendar" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={() => setView("calendar")}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nova demanda</Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar demanda" : "Nova demanda"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <Label>Título *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Trocar pneu do PT-XYZ" required />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aog">🚨 AOG</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="low">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prazo</Label>
                    <Input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                  </div>
                  <div>
                    <Label>Aeronave</Label>
                    <Select value={form.aircraft_id || "none"} onValueChange={(v) => setForm({ ...form, aircraft_id: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Nenhuma —</SelectItem>
                        {aircraft.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.prefix}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Responsável</Label>
                    <Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
                  </div>
                  <div>
                    <Label>Local</Label>
                    <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                  </div>
                </div>

                <div className="pt-2 pb-1 border-t border-white/5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                    <CalendarIcon className="h-3 w-3" /> Agendamento (Opcional)
                  </Label>
                  <div className="space-y-3">
                    <div>
                      <Label>Tipo de Agendamento</Label>
                      <Select value={form.schedule_type || "none"} onValueChange={(v) => setForm({ ...form, schedule_type: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {SCHEDULE_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Início</Label>
                        <Input type="datetime-local" value={form.scheduled_start} onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })} />
                      </div>
                      <div>
                        <Label>Fim</Label>
                        <Input type="datetime-local" value={form.scheduled_end} onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
                {(form.status === "done" || form.status === "cancelled") && (
                  <div>
                    <Label>Resolução / Observações finais</Label>
                    <Textarea
                      value={form.resolution_notes}
                      onChange={(e) => setForm({ ...form, resolution_notes: e.target.value })}
                      rows={3}
                      placeholder="Descreva como o aviso foi resolvido, peças usadas, responsável, etc."
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit">{editing ? "Salvar" : "Criar"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Concluir aviso</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {resolving && (
              <div className="rounded-lg border border-white/10 bg-background/40 p-3">
                <p className="text-sm font-semibold">{resolving.title}</p>
                {resolving.description && <p className="mt-1 text-xs text-muted-foreground">{resolving.description}</p>}
              </div>
            )}
            <div>
              <Label>Como foi resolvido?</Label>
              <Textarea
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                rows={4}
                placeholder="Ex.: Pneu substituído pelo P/N XYZ. Serviço executado por João às 14h."
                autoFocus
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Esta informação ficará salva no histórico do aviso.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setResolveOpen(false)}>Cancelar</Button>
              <Button onClick={confirmResolve}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Concluir e salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Megaphone} label="Ativas" value={counts.active} tone="text-foreground" />
        <StatCard icon={Siren} label="AOG" value={counts.aog} tone="text-red-400" pulse={counts.aog > 0} />
        <StatCard icon={AlertTriangle} label="Atrasadas" value={counts.overdue} tone="text-orange-400" />
        <StatCard icon={Clock} label="Vence ≤ 24h" value={counts.soon} tone="text-amber-400" />
      </div>

      <div className="mb-4 flex gap-2">
        {(["active", "all", "done"] as const).map((k) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "ghost"} onClick={() => setFilter(k)}>
            {k === "active" ? "Ativas" : k === "all" ? "Todas" : "Concluídas"}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center border border-dashed border-white/10">
          <Megaphone className="mx-auto h-14 w-14 text-muted-foreground/40" />
          <h3 className="mt-4 font-display text-lg font-semibold">Nenhuma demanda</h3>
          <p className="mt-1 text-sm text-muted-foreground">Crie a primeira demanda para começar.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((d) => <DemandCard key={d.id} d={d} onEdit={openEdit} onStatus={quickStatus} onDelete={remove} />)}
        </div>
      )}
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, tone, pulse }: any) {
  return (
    <Card className="border-white/5 bg-card/60 backdrop-blur">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-white/5", tone, pulse && "animate-pulse")}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className={cn("text-2xl font-display font-bold", tone)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DemandCard({ d, onEdit, onStatus, onDelete }: { d: Demand; onEdit: (d: Demand) => void; onStatus: (d: Demand, s: Demand["status"]) => void; onDelete: (id: string) => void }) {
  const now = new Date();
  const deadlineDate = d.deadline ? parseISO(d.deadline) : null;
  const hoursLeft = deadlineDate ? differenceInHours(deadlineDate, now) : null;
  const isOverdue = hoursLeft !== null && hoursLeft < 0 && d.status !== "done" && d.status !== "cancelled";
  const isSoon = hoursLeft !== null && hoursLeft >= 0 && hoursLeft <= 24 && d.status !== "done" && d.status !== "cancelled";
  const isAog = d.priority === "aog" && d.status !== "done" && d.status !== "cancelled";
  const done = d.status === "done" || d.status === "cancelled";

  return (
    <Card className={cn(
      "border bg-card/60 backdrop-blur transition-all",
      isAog ? "border-red-500/40 shadow-[0_0_30px_-10px_rgba(239,68,68,0.4)]" :
      isOverdue ? "border-orange-500/30" :
      isSoon ? "border-amber-500/20" : "border-white/5",
      done && "opacity-60"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider border", priorityClasses(d.priority))}>
                {d.priority === "aog" && <Siren className="h-3 w-3 mr-1" />}
                {PRIORITY_LABEL[d.priority]}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">{STATUS_LABEL[d.status]}</Badge>
              {d.schedule_type && (
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  <CalendarIcon className="h-3 w-3 mr-1" /> {scheduleTypeLabel(d.schedule_type)}
                </Badge>
              )}
              {d.aircraft_prefix && <span className="text-[10px] font-mono font-bold text-primary">{d.aircraft_prefix}</span>}
            </div>
            <CardTitle className={cn("text-base leading-tight", done && "line-through")}>{d.title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {d.description && <p className="text-sm text-muted-foreground line-clamp-2">{d.description}</p>}

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {deadlineDate && (
            <span className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 border",
              isOverdue ? "bg-red-500/10 text-red-300 border-red-500/30" :
              isSoon ? "bg-amber-500/10 text-amber-300 border-amber-500/30" :
              "bg-white/5 border-white/10"
            )}>
              <Clock className="h-3 w-3" />
              {format(deadlineDate, "dd/MM HH:mm", { locale: ptBR })}
              {hoursLeft !== null && !done && (
                <span className="font-semibold ml-1">
                  {isOverdue ? `(${Math.abs(hoursLeft)}h atraso)` : `(${hoursLeft}h)`}
                </span>
              )}
            </span>
          )}
          {d.scheduled_start && (
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 border bg-primary/5 border-primary/10 text-primary-foreground/80">
              <CalendarIcon className="h-3 w-3" />
              {format(parseISO(d.scheduled_start), "dd/MM HH:mm", { locale: ptBR })}
              {d.scheduled_end && ` - ${format(parseISO(d.scheduled_end), "dd/MM HH:mm", { locale: ptBR })}`}
            </span>
          )}
          {d.assigned_to && <span>👤 {d.assigned_to}</span>}
          {d.location && <span>📍 {d.location}</span>}
        </div>

        {done && d.resolution_notes && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
            <p className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-semibold">
              Resolução{d.completed_at ? ` · ${format(parseISO(d.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}` : ""}
            </p>
            <p className="mt-1 text-xs text-emerald-100/90 whitespace-pre-wrap">{d.resolution_notes}</p>
          </div>
        )}

        <div className="flex items-center gap-1 pt-2 border-t border-white/5">
          {d.status !== "done" && (
            <Button size="sm" variant="ghost" onClick={() => onStatus(d, "done")} className="text-emerald-400 hover:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
            </Button>
          )}
          {d.status === "open" && (
            <Button size="sm" variant="ghost" onClick={() => onStatus(d, "in_progress")}>
              Iniciar
            </Button>
          )}
          {done && (
            <Button size="sm" variant="ghost" onClick={() => onStatus(d, "open")}>
              Reabrir
            </Button>
          )}
          <div className="ml-auto flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => onEdit(d)}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(d.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}