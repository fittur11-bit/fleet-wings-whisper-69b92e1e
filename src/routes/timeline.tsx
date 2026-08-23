import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wrench, Package, Cog, History as HistoryIcon, FileText } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { useAircraft, useServices, useShipments, useParts, useDocuments } from "@/lib/queries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/timeline")({
  component: () => <AuthGuard><TimelinePage /></AuthGuard>,
});

type Event = {
  id: string;
  date: string;
  type: "service" | "shipment" | "part_install" | "part_remove" | "document";
  title: string;
  subtitle?: string;
  aircraft_id?: string | null;
  aircraft_prefix?: string;
  badge?: string;
};

const typeConfig: Record<Event["type"], { icon: any; color: string; label: string }> = {
  service: { icon: Wrench, color: "text-primary bg-primary/10 border-primary/20", label: "Serviço" },
  shipment: { icon: Package, color: "text-orange-400 bg-orange-500/10 border-orange-500/20", label: "Envio" },
  part_install: { icon: Cog, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "Peça instalada" },
  part_remove: { icon: Cog, color: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: "Peça removida" },
  document: { icon: FileText, color: "text-violet-400 bg-violet-500/10 border-violet-500/20", label: "Documento" },
};

function TimelinePage() {
  const { data: aircraft = [] } = useAircraft();
  const { data: services = [] } = useServices();
  const { data: shipments = [] } = useShipments();
  const { data: parts = [] } = useParts();
  const { data: documents = [] } = useDocuments();
  const [filterAc, setFilterAc] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const events: Event[] = useMemo(() => {
    const all: Event[] = [];

    services.forEach((s: any) => {
      if (!s.performed_at && !s.created_at) return;
      all.push({
        id: `svc-${s.id}`,
        date: s.performed_at || s.created_at.split("T")[0],
        type: "service",
        title: (s.service_types || [s.service_type]).join(", "),
        subtitle: s.description || s.location || s.technician,
        aircraft_id: s.aircraft_id,
        aircraft_prefix: s.aircraft?.prefix || s.aircraft_prefix,
        badge: s.status,
      });
    });

    shipments.forEach((s: any) => {
      all.push({
        id: `ship-out-${s.id}`,
        date: s.shipping_date,
        type: "shipment",
        title: `Enviada: ${s.part_name}`,
        subtitle: s.destination_workshop || undefined,
        aircraft_id: s.aircraft_id,
        aircraft_prefix: s.aircraft?.prefix,
        badge: s.status,
      });
      if (s.actual_return_date) {
        all.push({
          id: `ship-in-${s.id}`,
          date: s.actual_return_date,
          type: "shipment",
          title: `Recebida: ${s.part_name}`,
          subtitle: s.destination_workshop || undefined,
          aircraft_id: s.aircraft_id,
          aircraft_prefix: s.aircraft?.prefix,
          badge: "recebida",
        });
      }
    });

    parts.forEach((p: any) => {
      if (p.install_date) {
        all.push({
          id: `part-in-${p.id}`,
          date: p.install_date,
          type: "part_install",
          title: `Instalada: ${p.name}`,
          subtitle: p.serial_number ? `S/N ${p.serial_number}` : p.part_number || undefined,
          aircraft_id: p.aircraft_id,
          aircraft_prefix: p.aircraft?.prefix,
        });
      }
      if (p.removal_date) {
        all.push({
          id: `part-out-${p.id}`,
          date: p.removal_date,
          type: "part_remove",
          title: `Removida: ${p.name}`,
          subtitle: p.serial_number ? `S/N ${p.serial_number}` : p.part_number || undefined,
          aircraft_id: p.aircraft_id,
          aircraft_prefix: p.aircraft?.prefix,
        });
      }
    });

    documents.forEach((d: any) => {
      const dt = d.revision_date || d.created_at?.split("T")[0];
      if (!dt) return;
      all.push({
        id: `doc-${d.id}`,
        date: dt,
        type: "document",
        title: d.title,
        subtitle: `${d.doc_type}${d.version ? ` · v${d.version}` : ""}`,
        aircraft_id: d.aircraft_id,
        aircraft_prefix: aircraft.find((a: any) => a.id === d.aircraft_id)?.prefix,
      });
    });

    return all
      .filter((e) => filterAc === "all" || e.aircraft_id === filterAc)
      .filter((e) => filterType === "all" || e.type === filterType)
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [services, shipments, parts, documents, aircraft, filterAc, filterType]);

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach((e) => {
      const key = e.date.slice(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries());
  }, [events]);

  return (
    <AppShell>
      <PageHeader
        title="Histórico Consolidado"
        description="Linha do tempo de voos, serviços, peças e envios."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Select value={filterAc} onValueChange={setFilterAc}>
          <SelectTrigger className="sm:w-64"><SelectValue placeholder="Aeronave" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as aeronaves</SelectItem>
            {aircraft.map((a: any) => (
              <SelectItem key={a.id} value={a.id}>{a.prefix} — {a.model || "—"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="sm:w-56"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os eventos</SelectItem>
            {Object.entries(typeConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {events.length === 0 ? (
        <div className="technical-card  p-16 text-center border-dashed border-white/10">
          <HistoryIcon className="mx-auto h-14 w-14 text-muted-foreground/40" />
          <h3 className="mt-4 font-display text-lg font-semibold">Sem eventos</h3>
          <p className="mt-1 text-sm text-muted-foreground">Nenhum registro para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([month, items]) => (
            <div key={month}>
              <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground mb-3">
                {format(parseISO(month + "-01"), "MMMM 'de' yyyy", { locale: ptBR })}
                <span className="ml-2 text-xs">({items.length})</span>
              </h3>
              <div className="relative pl-6 border-l border-white/10 space-y-3">
                {items.map((e) => {
                  const cfg = typeConfig[e.type];
                  const Icon = cfg.icon;
                  return (
                    <div key={e.id} className="relative">
                      <div className={`absolute -left-[34px] top-2 flex h-7 w-7 items-center justify-center rounded-full border ${cfg.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="technical-card rounded-md border border-white/5 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[9px] uppercase tracking-wider">{cfg.label}</Badge>
                              {e.aircraft_prefix && (
                                <span className="text-[10px] font-mono font-bold text-primary">{e.aircraft_prefix}</span>
                              )}
                              {e.badge && <Badge variant="secondary" className="text-[9px] capitalize">{e.badge}</Badge>}
                            </div>
                            <p className="text-sm font-medium truncate">{e.title}</p>
                            {e.subtitle && <p className="text-xs text-muted-foreground line-clamp-1">{e.subtitle}</p>}
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                            {format(parseISO(e.date), "dd/MM", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
