import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
 import { Plus, Package, Search, Pencil, Trash2, Eye, ArrowDownToLine, ArrowUpFromLine, Settings2, History as HistoryIcon, Upload, Download, FileText } from "lucide-react";
 import { jsPDF } from "jspdf";
 import autoTable from "jspdf-autotable";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { useParts, useAircraft, useShipments, useServices } from "@/lib/queries";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PART_STATUS, PART_CONDITION } from "@/lib/constants";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Checkbox } from "@/components/ui/checkbox";
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
  stock: "bg-primary/10 text-primary border-primary/20",
  installed: "bg-[#37805A]/10 text-[#37805A] border-[#37805A]/20",
  scrapped: "bg-muted text-muted-foreground border-border",
  sent_repair: "bg-[#C58A21]/10 text-[#C58A21] border-[#C58A21]/20",
};

const conditionStyles: Record<string, string> = {
  new: "bg-[#37805A]/10 text-[#37805A] border-[#37805A]/20",
  serviceable: "bg-sky-600/10 text-sky-600 border-sky-600/20",
  unserviceable: "bg-[#B94A48]/10 text-[#B94A48] border-[#B94A48]/20",
  overhauled: "bg-indigo-600/10 text-indigo-600 border-indigo-600/20",
  repairable: "bg-[#C58A21]/10 text-[#C58A21] border-[#C58A21]/20",
  damaged: "bg-[#B94A48]/15 text-[#B94A48] border-[#B94A48]/30",
  consumable: "bg-slate-600/10 text-slate-600 border-slate-600/20",
  workshop_use: "bg-slate-600/10 text-slate-600 border-slate-600/20",
  quarantine: "bg-[#C58A21]/10 text-[#C58A21] border-[#C58A21]/20",
  expired: "bg-[#B94A48]/10 text-[#B94A48] border-[#B94A48]/20",
  loaner: "bg-cyan-600/10 text-cyan-600 border-cyan-600/20",
  core: "bg-purple-600/10 text-purple-600 border-purple-600/20",
};

const fmtBRL = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  const [importing, setImporting] = useState(false);

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
 
   const downloadPDF = () => {
     const doc = new jsPDF();
     doc.setFontSize(18);
     doc.text("Relatório de Peças e Componentes", 14, 22);
     doc.setFontSize(11);
     doc.setTextColor(100);
     doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 30);
 
     const tableData = filtered.map((p: any) => [
       p.name || "",
       p.part_number || "",
       p.serial_number || "",
       PART_CONDITION.find(c => c.value === p.condition)?.label || "",
       PART_STATUS.find(s => s.value === p.status)?.label || "",
       p.aircraft?.prefix || "",
       fmtBRL(p.unit_price) || "—"
     ]);
 
     autoTable(doc, {
       startY: 35,
       head: [["Nome", "P/N", "S/N", "Condição", "Status", "Aeronave", "Vlr. Unit"]],
       body: tableData,
       headStyles: { fillColor: [12, 17, 29] },
       alternateRowStyles: { fillColor: [245, 247, 250] },
     });
 
     doc.save("relatorio_pecas.pdf");
     toast.success("Relatório PDF gerado com sucesso");
   };

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

  const downloadTemplate = () => {
    const csv = [
      "name,part_number,serial_number,condition,status,aircraft_prefix,origin,unit_price,install_date,removal_date,hours_at_install,notes",
      "Filtro de Óleo,CH48108-1,,new,stock,,Tempest,45.90,,,,Exemplo em estoque",
      "Vela,REM38E,SN12345,serviceable,installed,PT-ABC,Champion,120.00,2025-01-15,,1250.5,Exemplo instalada",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "modelo_pecas.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];
    const parseLine = (line: string) => {
      const out: string[] = []; let cur = ""; let q = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
        } else if (c === "," && !q) { out.push(cur); cur = ""; }
        else cur += c;
      }
      out.push(cur);
      return out.map((s) => s.trim());
    };
    const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
    return lines.slice(1).map((l) => {
      const cells = parseLine(l);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = cells[i] ?? ""; });
      return row;
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Faça login para importar.");
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) { toast.error("CSV vazio ou inválido."); return; }

      const validConditions = PART_CONDITION.map((c) => c.value);
      const validStatuses = PART_STATUS.map((s) => s.value);
      const prefixMap = new Map<string, string>(
        (aircraft as any[]).map((a) => [a.prefix?.toUpperCase(), a.id])
      );

      const payload: any[] = [];
      const errors: string[] = [];
      rows.forEach((r, idx) => {
        const name = r["name"]?.trim();
        if (!name) { errors.push(`Linha ${idx + 2}: nome obrigatório`); return; }
        const prefix = r["aircraft_prefix"]?.toUpperCase().trim();
        const aircraft_id = prefix ? prefixMap.get(prefix) ?? null : null;
        if (prefix && !aircraft_id) errors.push(`Linha ${idx + 2}: prefixo ${prefix} não encontrado (peça importada sem aeronave)`);
        const cond = r["condition"]?.trim() || null;
        const status = r["status"]?.trim() || "stock";
        if (cond && !validConditions.includes(cond as any)) { errors.push(`Linha ${idx + 2}: condição inválida (${cond})`); return; }
        if (!validStatuses.includes(status as any)) { errors.push(`Linha ${idx + 2}: status inválido (${status})`); return; }
        const hrs = r["hours_at_install"]?.trim();
        const price = r["unit_price"]?.trim().replace(",", ".");
        payload.push({
          user_id: user.id,
          name,
          part_number: r["part_number"]?.trim() || null,
          serial_number: r["serial_number"]?.trim() || null,
          condition: cond,
          status,
          aircraft_id,
          origin: r["origin"]?.trim() || null,
          unit_price: price ? Number(price) : 0,
          install_date: r["install_date"]?.trim() || null,
          removal_date: r["removal_date"]?.trim() || null,
          hours_at_install: hrs ? Number(hrs) : null,
          notes: r["notes"]?.trim() || null,
        });
      });

      if (payload.length === 0) {
        toast.error("Nenhuma linha válida. " + (errors[0] ?? ""));
        return;
      }
      const { error } = await supabase.from("parts").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success(`${payload.length} peça(s) importada(s)${errors.length ? ` · ${errors.length} aviso(s)` : ""}`);
      if (errors.length) console.warn("Avisos de importação:", errors);
      qc.invalidateQueries({ queryKey: ["parts"] });
    } catch (err: any) {
      toast.error("Erro ao ler CSV: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Peças & Componentes"
        description="Controle de estoque, instalação e rastreabilidade"
        actions={
          <div className="flex flex-wrap gap-2">
             <Button type="button" variant="outline" size="sm" onClick={downloadPDF} className="border-white/10">
               <FileText className="mr-2 h-4 w-4" /> Exportar PDF
             </Button>
             <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} className="border-white/10">
               <Download className="mr-2 h-4 w-4" /> Modelo CSV
             </Button>
            <label>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} disabled={importing} />
              <Button type="button" variant="outline" size="sm" disabled={importing} className="border-white/10" asChild>
                <span><Upload className="mr-2 h-4 w-4" /> {importing ? "Importando..." : "Importar CSV"}</span>
              </Button>
            </label>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
             <DialogTrigger asChild>
               <Button onClick={openCreate} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                 <Plus className="mr-2 h-4 w-4" /> Nova Peça
               </Button>
             </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-sans text-xl">
                  {editing ? `Editar ${editing.name}` : "Nova Peça"}
                </DialogTitle>
              </DialogHeader>
              <PartForm initial={editing} aircraft={aircraft} onDone={() => { setOpen(false); setEditing(null); }} />
            </DialogContent>
          </Dialog>
          </div>
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
          <div key={s.label} className="technical-card p-4">
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
          {[...Array(5)].map((_, i) => <div key={i} className="technical-card animate-pulse h-20" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="technical-card p-16 text-center">
          <Package className="mx-auto h-14 w-14 text-muted-foreground/40" />
          <h3 className="mt-4 font-sans text-lg font-semibold">
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
            const photoUrl = photos[0] ? (typeof photos[0] === 'string' ? photos[0] : photos[0].url) : null;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="technical-card p-4 flex items-center gap-4"
              >
                {/* Photo */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-muted border border-border flex items-center justify-center">
                  {photoUrl ? (
                    <img src={photoUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-7 w-7 text-neutral-400/50" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-sans font-semibold truncate">{p.name}</h3>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusStyles[p.status]}`}>
                      {statusLabel}
                    </span>
                    {p.condition && (
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold border uppercase tracking-widest ${conditionStyles[p.condition] || "bg-muted text-muted-foreground border-border"}`}>
                        {condLabel}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground font-mono">
                    {p.part_number && <span>P/N: <span className="text-foreground font-bold">{p.part_number}</span></span>}
                    {p.serial_number && <span>S/N: <span className="text-foreground font-bold">{p.serial_number}</span></span>}
                     {p.aircraft?.prefix && <span className="text-primary font-bold tracking-widest">{p.aircraft.prefix}</span>}
                     {fmtBRL(p.unit_price) && <span className="text-[#37805A] font-bold">{fmtBRL(p.unit_price)}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {p.status === "stock" && (
                    <Button size="sm" variant="ghost" onClick={() => openAction(p, "install")} className="text-[#37805A] hover:bg-[#37805A]/10">
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
  const { data: shipments = [] } = useShipments();
  const { data: services = [] } = useServices();

  const history = useMemo(() => {
    const events: { date: string; type: string; title: string; subtitle?: string; color: string }[] = [];
    if (part.install_date) events.push({
      date: part.install_date, type: "Instalação", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      title: `Instalada${part.aircraft?.prefix ? ` em ${part.aircraft.prefix}` : ""}`,
      subtitle: part.hours_at_install ? `${part.hours_at_install}h da aeronave` : undefined,
    });
    if (part.removal_date) events.push({
      date: part.removal_date, type: "Remoção", color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      title: "Removida da aeronave",
    });
    shipments.filter((s: any) => s.part_id === part.id).forEach((s: any) => {
      events.push({
        date: s.shipping_date, type: "Envio", color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
        title: `Enviada para ${s.destination_workshop || "oficina"}`,
        subtitle: s.budget_amount ? `Orçamento: R$ ${Number(s.budget_amount).toFixed(2)}` : undefined,
      });
      if (s.actual_return_date) events.push({
        date: s.actual_return_date, type: "Retorno", color: "text-sky-400 border-sky-500/30 bg-sky-500/10",
        title: "Retornou da oficina",
      });
    });
    services.filter((sv: any) => sv.aircraft_id && sv.aircraft_id === part.aircraft_id && sv.performed_at).forEach((sv: any) => {
      events.push({
        date: sv.performed_at, type: "Serviço",
        color: "text-primary border-primary/30 bg-primary/10",
        title: (sv.service_types || [sv.service_type]).join(", "),
        subtitle: sv.technician || sv.location,
      });
    });
    return events.sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [part, shipments, services]);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-sans text-2xl">{part.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-5">
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((item: any, idx: number) => {
              const url = typeof item === 'string' ? item : item.url;
              return (
                <a key={idx} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-white/10">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </a>
              );
            })}
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
            { label: "Preço unitário", value: fmtBRL(part.unit_price) },
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

        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <HistoryIcon className="h-3.5 w-3.5" /> Histórico de vida
          </p>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-white/5 rounded-lg p-3">Sem eventos registrados.</p>
          ) : (
            <div className="relative pl-5 border-l border-white/10 space-y-2">
              {history.map((e, i) => (
                <div key={i} className="relative">
                  <div className={`absolute -left-[26px] top-2 h-3 w-3 rounded-full border ${e.color}`} />
                  <div className="rounded-lg border border-white/5 bg-white/5 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{e.type}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">{format(parseISO(e.date), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                    <p className="text-sm font-medium mt-0.5">{e.title}</p>
                    {e.subtitle && <p className="text-xs text-muted-foreground">{e.subtitle}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
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
      status: "stock", condition: "new", aircraft_id: null, unit_price: "",
       install_date: "", removal_date: "", hours_at_install: "", notes: "", photos: [],
       applicable_models: [], cross_reference_pns: "", is_pma: false,
    },
  });
  const photos = watch("photos") || [];
  const status = watch("status");

  const onSubmit = async (values: any) => {
    if (!user) return;
    const payload: any = {
      user_id: user.id,
      name: values.name,
      part_number: values.part_number || null,
      serial_number: values.serial_number || null,
      origin: values.origin || null,
      status: values.status,
      condition: values.condition || null,
      aircraft_id: values.aircraft_id || null,
      unit_price: values.unit_price ? Number(String(values.unit_price).replace(",", ".")) : 0,
      hours_at_install: values.hours_at_install ? Number(values.hours_at_install) : null,
      install_date: values.install_date || null,
      removal_date: values.removal_date || null,
      notes: values.notes || null,
       photos: values.photos || [],
       applicable_models: values.applicable_models || [],
       cross_reference_pns: typeof values.cross_reference_pns === 'string' 
         ? values.cross_reference_pns.split(",").map((s: string) => s.trim()).filter(Boolean)
         : values.cross_reference_pns || [],
       is_pma: !!values.is_pma,
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
        <div>
          <Label>Preço unitário (R$)</Label>
          <Input type="number" step="0.01" {...register("unit_price")} placeholder="0,00" className="bg-card/50 border-white/10 font-mono" />
        </div>
        <div>
          <Label>Aeronave</Label>
          <Select value={watch("aircraft_id") || ""} onValueChange={(v) => setValue("aircraft_id", v === "none" ? null : v)}>
            <SelectTrigger className="bg-card/50 border-white/10"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {aircraft.map((a) => <SelectItem key={a.id} value={a.id}>{a.prefix} — {a.model}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Instalada em</Label>
          <Input type="date" {...register("install_date")} className="bg-card/50 border-white/10" />
        </div>
        <div>
          <Label>Removida em</Label>
          <Input type="date" {...register("removal_date")} className="bg-card/50 border-white/10" />
        </div>
        <div>
          <Label>Horas na instalação</Label>
          <Input type="number" step="0.1" {...register("hours_at_install")} className="bg-card/50 border-white/10 font-mono" />
        </div>
        <div className="sm:col-span-2">
          <Label>Observações</Label>
          <Textarea {...register("notes")} rows={3} className="bg-card/50 border-white/10" />
        </div>
         <div className="sm:col-span-2 border-t border-white/5 pt-4">
           <Label className="text-primary">Dados de Aplicabilidade (Assistente de Vendas)</Label>
           <div className="grid gap-4 sm:grid-cols-2 mt-2">
             <div>
               <Label>P/Ns Alternativos (separados por vírgula)</Label>
               <Input 
                 {...register("cross_reference_pns")} 
                 placeholder="Ex: PN-123, PN-456"
                 className="bg-card/50 border-white/10 font-mono"
                 defaultValue={Array.isArray(initial?.cross_reference_pns) ? initial.cross_reference_pns.join(", ") : ""}
               />
             </div>
             <div className="flex items-center gap-2 pt-6">
               <Checkbox 
                 id="is_pma" 
                 checked={watch("is_pma")} 
                 onCheckedChange={(v) => setValue("is_pma", !!v)} 
               />
               <Label htmlFor="is_pma" className="cursor-pointer">Certificado PMA</Label>
             </div>
             <div className="sm:col-span-2">
               <Label>Modelos de Aeronaves Compatíveis (ex: Cessna 172, Piper Arrow)</Label>
               <Input 
                 placeholder="Digite um modelo e pressione Enter"
                 className="bg-card/50 border-white/10"
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     e.preventDefault();
                     const val = (e.target as HTMLInputElement).value.trim();
                     if (val) {
                       const current = watch("applicable_models") || [];
                       if (!current.includes(val)) {
                         setValue("applicable_models", [...current, val]);
                         (e.target as HTMLInputElement).value = "";
                       }
                     }
                   }
                 }}
               />
               <div className="flex flex-wrap gap-2 mt-2">
                 {(watch("applicable_models") || []).map((m: string, idx: number) => (
                   <Badge key={idx} variant="outline" className="gap-1 bg-primary/5">
                     {m}
                     <button 
                       type="button" 
                       onClick={() => {
                         const current = watch("applicable_models") || [];
                         setValue("applicable_models", current.filter((_: any, i: number) => i !== idx));
                       }}
                       className="ml-1 text-muted-foreground hover:text-destructive"
                     >
                       ×
                     </button>
                   </Badge>
                 ))}
               </div>
             </div>
           </div>
         </div>
         <div className="sm:col-span-2">
           <Label>Fotos</Label>
           <ImageUpload bucket="part-photos" value={photos} onChange={(v) => setValue("photos", v)} multiple withDescription label="Adicionar fotos" />
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
        <DialogTitle className="font-sans text-xl flex items-center gap-2">
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
