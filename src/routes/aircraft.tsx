import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Plus, Plane, Trash2, Pencil, Search, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { useAircraft } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AircraftForm } from "@/components/AircraftForm";
import { CVAStatusBadge } from "@/components/CVAStatusBadge";
import { AIRCRAFT_STATUS, AIRCRAFT_CATEGORIES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/aircraft")({
  component: () => <AuthGuard><AircraftPage /></AuthGuard>,
});

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-600/40 dark:border-emerald-500/30",
  maintenance: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-600/40 dark:border-orange-500/30",
  inactive: "bg-foreground/5 text-muted-foreground border-foreground/10",
  non_conform: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-600/40 dark:border-red-500/30",
};

function AircraftPage() {
  const { data: aircraft = [], isLoading } = useAircraft();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = useMemo(() => {
    return aircraft.filter((a: any) => {
      const matchSearch = !search ||
        a.prefix?.toLowerCase().includes(search.toLowerCase()) ||
        a.model?.toLowerCase().includes(search.toLowerCase()) ||
        a.manufacturer?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      const matchCategory =
        categoryFilter === "all" ||
        (categoryFilter === "none" ? !a.category : a.category === categoryFilter);
      return matchSearch && matchStatus && matchCategory;
    });
  }, [aircraft, search, statusFilter, categoryFilter]);

  const remove = async (id: string) => {
    if (!confirm("Excluir aeronave? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("aircraft").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Aeronave excluída");
    qc.invalidateQueries({ queryKey: ["aircraft"] });
  };

  const openEdit = (a: any) => { setEditing(a); setOpen(true); };
  const openCreate = () => { setEditing(null); setOpen(true); };

  return (
    <AppShell>
      <PageHeader
        title="Aeronaves"
        description={`${aircraft.length} aeronave(s) cadastrada(s) na frota`}
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
             <DialogTrigger asChild>
               <Button onClick={openCreate} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                 <Plus className="mr-2 h-4 w-4" /> Nova Aeronave
               </Button>
             </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {editing ? `Editar ${editing.prefix}` : "Nova Aeronave"}
                </DialogTitle>
              </DialogHeader>
              <AircraftForm initial={editing} onDone={() => { setOpen(false); setEditing(null); }} />
            </DialogContent>
          </Dialog>
        }
      />

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por prefixo, modelo ou fabricante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/50 border-white/10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card/50 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {AIRCRAFT_STATUS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card/50 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {AIRCRAFT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
            <SelectItem value="none">Sem categoria</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse rounded-2xl h-72" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <Plane className="mx-auto h-14 w-14 text-muted-foreground/40" />
          <h3 className="mt-4 font-display text-lg font-semibold">
            {aircraft.length === 0 ? "Nenhuma aeronave cadastrada" : "Nenhuma aeronave encontrada"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {aircraft.length === 0 ? "Adicione sua primeira aeronave para começar." : "Tente ajustar os filtros de busca."}
          </p>
           {aircraft.length === 0 && (
             <Button onClick={openCreate} className="mt-6 bg-primary text-primary-foreground shadow-lg shadow-primary/20">
               <Plus className="mr-2 h-4 w-4" /> Cadastrar Aeronave
             </Button>
           )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a: any, i: number) => {
            const statusLabel = AIRCRAFT_STATUS.find(s => s.value === a.status)?.label || a.status;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card glass-card-hover group rounded-2xl overflow-hidden flex flex-col"
              >
                {/* Photo */}
                <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-primary/10 to-transparent">
                  {a.photo_url ? (
                    <img src={a.photo_url} alt={a.prefix} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Plane className="h-16 w-16 text-primary/30" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 right-3 flex justify-between gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-md ${statusStyles[a.status] || statusStyles.inactive}`}>
                      {statusLabel}
                    </span>
                    {a.cva_expiration && <CVAStatusBadge expiration={a.cva_expiration} className="backdrop-blur-md" />}
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 p-5">
                  <p className="font-mono text-lg font-bold text-primary tracking-wider">{a.prefix}</p>
                  <h3 className="font-display font-semibold mt-1 truncate">
                    {a.manufacturer} {a.model}
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-70">Horas</p>
                      <p className="font-mono text-sm text-foreground">{Number(a.total_hours || 0).toFixed(1)}h</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider opacity-70">Ano</p>
                      <p className="font-mono text-sm text-foreground">{a.year || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex border-t border-white/5">
                  <button onClick={() => setViewing(a)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition">
                    <Eye className="h-3.5 w-3.5" /> Detalhes
                  </button>
                  <button onClick={() => openEdit(a)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-white/5 hover:text-primary transition border-l border-white/5">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button onClick={() => remove(a.id)} className="flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition border-l border-white/5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* View Detail Dialog */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl flex items-center gap-3">
                  <span className="font-mono text-primary">{viewing.prefix}</span>
                  <span className="text-muted-foreground font-sans text-base font-normal">
                    {viewing.manufacturer} {viewing.model}
                  </span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {viewing.photo_url && (
                  <img src={viewing.photo_url} alt={viewing.prefix} className="w-full aspect-[16/9] object-cover rounded-xl" />
                )}

                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[viewing.status]}`}>
                    {AIRCRAFT_STATUS.find(s => s.value === viewing.status)?.label}
                  </span>
                  {viewing.cva_expiration && <CVAStatusBadge expiration={viewing.cva_expiration} />}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Nº de Série", value: viewing.serial_number },
                    { label: "Ano", value: viewing.year },
                    { label: "Horas Totais", value: viewing.total_hours ? `${Number(viewing.total_hours).toFixed(1)}h` : null },
                    { label: "Proprietário", value: viewing.owner },
                    { label: "CVA", value: viewing.cva_expiration },
                    { label: "Última Inspeção", value: viewing.last_inspection_date },
                  ].map((f) => (
                    <div key={f.label} className="rounded-lg bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</p>
                      <p className="mt-1 font-mono text-sm">{f.value || "—"}</p>
                    </div>
                  ))}
                </div>

                {viewing.notes && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Observações</p>
                    <p className="text-sm bg-white/5 rounded-lg p-3 whitespace-pre-wrap">{viewing.notes}</p>
                  </div>
                )}

                {Array.isArray(viewing.gallery) && viewing.gallery.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Galeria</p>
                    <div className="grid grid-cols-3 gap-2">
                      {viewing.gallery.map((url: string) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-primary/40 transition">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                  <Button variant="outline" onClick={() => { setViewing(null); openEdit(viewing); }}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
