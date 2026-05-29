import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plane, Wrench, Cog, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  BookMarked, BarChart3, PieChart as PieChartIcon, ArrowUpRight, Activity,
  Package, ShieldCheck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useAircraft, useServices, useParts, useMaintenanceItems, useShipments } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

/**
 * Dashboard com layout Bento Grid.
 * Paleta local: Charcoal & Ember (#1a1a1a / #2d2d2d / #4a4a4a / #e85d3a).
 * Tipografia: Sora (display) + Manrope (body), já carregadas globalmente.
 */

const EMBER = "#e85d3a";
const EMBER_SOFT = "#f5c0a8";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel — FlightCore" },
      { name: "description", content: "Visão geral da frota: aeronaves ativas, manutenções pendentes, peças instaladas e métricas operacionais." },
      { property: "og:title", content: "Painel — FlightCore" },
      { property: "og:description", content: "Visão geral da frota: aeronaves ativas, manutenções pendentes, peças instaladas e métricas operacionais." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <AuthGuard>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </AuthGuard>
  );
}

// ─── Bento primitives ──────────────────────────────────────────────────

function BentoCard({
  className,
  to,
  children,
  accent = false,
}: {
  className?: string;
  to?: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  const base = cn(
    "group relative overflow-hidden rounded-2xl border transition-all duration-500",
    "bg-neutral-900/50 backdrop-blur-sm",
    accent
      ? "border-[#e85d3a]/30 shadow-[0_0_40px_-15px_rgba(232,93,58,0.3)]"
      : "border-white/[0.05] hover:border-[#e85d3a]/20",
    to && "hover:bg-neutral-900/80 hover:-translate-y-0.5",
    className,
  );
  const content = (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      {accent && (
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#e85d3a]/10 blur-[80px]" />
      )}
      <div className="relative p-6">{children}</div>
    </>
  );
  if (to) {
    return (
      <Link to={to as any} className={base}>
        {content}
      </Link>
    );
  }
  return <div className={base}>{content}</div>;
}

function SectionLabel({ 
  icon: Icon, 
  children, 
  tone = "default", 
  count 
}: { 
  icon: any; 
  children: React.ReactNode; 
  tone?: "default" | "ember" | "warn" | "ok"; 
  count?: number 
}) {
  const toneClass = {
    default: "text-neutral-500",
    ember: "text-[#e85d3a]",
    warn: "text-amber-500/80",
    ok: "text-emerald-500/80",
  }[tone];
  
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className={cn("flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.2em]", toneClass)}>
        <div className={cn("flex h-6 w-6 items-center justify-center rounded-lg bg-current/10")}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        {children}
      </div>
      {typeof count === "number" && count > 0 && (
        <span className="flex h-5 items-center rounded-full bg-white/[0.03] px-2 font-mono text-[10px] text-neutral-500 ring-1 ring-inset ring-white/10">
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────

function DashboardContent() {
  const { data: aircraft = [] } = useAircraft();
  const { data: services = [] } = useServices();
  const { data: parts = [] } = useParts();
  const { data: mx = [] } = useMaintenanceItems();
  const { data: shipments = [] } = useShipments();

  const activeAircraft = aircraft.filter((a: any) => a.status === "active").length;
  const inMaintenance = aircraft.filter((a: any) => a.status === "maintenance").length;
  const installedParts = parts.filter((p: any) => p.status === "installed").length;
  const pendingServices = services.filter((s: any) => s.status === "pending" || s.status === "in_progress").length;

  const today = new Date();
  const cvaAlerts = aircraft
    .filter((a: any) => a.cva_expiration)
    .map((a: any) => ({ ...a, daysLeft: differenceInDays(parseISO(a.cva_expiration), today) }))
    .filter((a: any) => a.daysLeft <= 60)
    .sort((a: any, b: any) => a.daysLeft - b.daysLeft);

  const upcomingMx = mx
    .filter((m: any) => m.due_date)
    .map((m: any) => ({ ...m, daysLeft: differenceInDays(parseISO(m.due_date), today) }))
    .filter((m: any) => m.daysLeft <= 60)
    .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  const lateShipments = shipments
    .filter((s: any) => s.status !== "received" && s.status !== "cancelled" && s.estimated_return_date)
    .map((s: any) => ({ ...s, daysLate: differenceInDays(today, parseISO(s.estimated_return_date)) }))
    .filter((s: any) => s.daysLate > 0)
    .sort((a: any, b: any) => b.daysLate - a.daysLate)
    .slice(0, 4);

  const recentServices = services.slice(0, 5);
  const totalFlightHours = aircraft.reduce((sum: number, a: any) => sum + Number(a.total_hours || 0), 0);
  const stockValue = parts.reduce((sum: number, p: any) => sum + (Number(p.unit_price) || 0), 0);

  const last6Months = [...Array(6)].map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return {
      month: format(d, "MMM", { locale: ptBR }),
      count: services.filter((s: any) => {
        if (!s.performed_at) return false;
        const sd = parseISO(s.performed_at);
        return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
      }).length,
    };
  }).reverse();

  const conditionData = [
    { name: "Novo", value: parts.filter((p: any) => p.condition === "new").length, color: "#e85d3a" },
    { name: "Serviçável", value: parts.filter((p: any) => p.condition === "serviceable").length, color: "#f5c0a8" },
    { name: "Reparo", value: parts.filter((p: any) => p.condition === "repairable" || p.condition === "unserviceable").length, color: "#a8a29e" },
    { name: "Outros", value: parts.filter((p: any) => !["new", "serviceable", "repairable", "unserviceable"].includes(p.condition || "")).length, color: "#4a4a4a" },
  ].filter((d) => d.value > 0);

  const totalAlerts = cvaAlerts.length + upcomingMx.length + lateShipments.length;
  const criticalAlerts = cvaAlerts.filter((a: any) => a.daysLeft <= 15).length + lateShipments.length;

  return (
    <>
      <PageHeader
        title="Painel"
        description="Centro de comando da operação · monitoramento em tempo real."
      />

      {/* ─── ROW 1 — Hero KPI + KPIs secundários + Alertas ─────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {/* Hero KPI — Frota Ativa (3 cols) */}
        <BentoCard to="/aircraft" className="md:col-span-3 md:row-span-2">
          <SectionLabel icon={Plane} tone="ember">Frota Ativa</SectionLabel>
          <div className="flex items-end justify-between">
            <div className="relative">
              <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-[#e85d3a]/20 blur-[40px] opacity-0 transition-opacity group-hover:opacity-100" />
              <p className="font-display text-8xl font-bold tracking-tighter text-white tabular-nums">
                {String(activeAircraft).padStart(2, "0")}
              </p>
              <p className="mt-2 text-sm text-neutral-400">
                de <span className="font-mono text-white/90">{aircraft.length}</span> aeronaves operacionais
              </p>
            </div>
            <div className="hidden h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.03] text-[#e85d3a] ring-1 ring-inset ring-white/10 sm:flex">
              <Plane className="h-10 w-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" />
            </div>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/[0.06] pt-8">
            <MiniStat label="Manutenção" value={inMaintenance} />
            <MiniStat label="Instaladas" value={installedParts} />
            <MiniStat label="Serviços" value={pendingServices} />
          </div>
          <div className="mt-8 flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#e85d3a] opacity-0 transition-all duration-300 group-hover:opacity-100">
            <span>EXPLORAR FROTA COMPLETA</span>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </BentoCard>

        {/* Alertas críticos (3 cols) — destaque ember */}
        <BentoCard accent className="md:col-span-3">
          <SectionLabel icon={AlertTriangle} tone="ember">Status de Atenção</SectionLabel>
          <div className="flex items-center gap-8">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-[#e85d3a]/20 blur-2xl" />
              <p className="relative font-display text-7xl font-bold tracking-tight tabular-nums" style={{ color: EMBER }}>
                {totalAlerts}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-white tabular-nums">
                {criticalAlerts} <span className="text-sm font-medium text-neutral-400 uppercase tracking-widest">Críticos</span>
              </p>
              <p className="text-xs text-neutral-500">Ações imediatas recomendadas</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/10">
              <p className="text-[10px] font-bold text-neutral-500 uppercase">CVA</p>
              <p className="mt-1 text-lg font-bold text-white">{cvaAlerts.length}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/10">
              <p className="text-[10px] font-bold text-neutral-500 uppercase">Envios</p>
              <p className="mt-1 text-lg font-bold text-white">{lateShipments.length}</p>
            </div>
          </div>
        </BentoCard>

        {/* Valor estoque (3 cols) */}
        <BentoCard to="/parts" className="md:col-span-3">
          <SectionLabel icon={TrendingUp}>Ativos em Estoque</SectionLabel>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-[#e85d3a]">R$</span>
            <p className="font-display text-4xl font-bold tracking-tight text-white tabular-nums">
              {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(stockValue)}
            </p>
          </div>
          <p className="mt-2 text-xs text-neutral-500">{parts.length} componentes inventariados</p>
          <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/[0.03]">
            <div className="h-full bg-gradient-to-r from-[#e85d3a] to-[#f5c0a8]" style={{ width: "65%" }} />
          </div>
        </BentoCard>

      </div>

      {/* ─── ROW 2 — Gráficos ──────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-6">
        <BentoCard className="md:col-span-4">
          <SectionLabel icon={BarChart3} tone="ember">Frequência de Manutenção</SectionLabel>
          <div className="h-[220px] -ml-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last6Months} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" className="opacity-[0.03]" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#525252" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ dy: 10 }}
                />
                <YAxis 
                  stroke="#525252" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false}
                  tick={{ dx: -10 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.02)" }}
                  contentStyle={{ 
                    backgroundColor: "#171717", 
                    border: "1px solid rgba(255,255,255,0.05)", 
                    borderRadius: "12px", 
                    color: "#fafaf9", 
                    fontSize: "11px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
                  }}
                  itemStyle={{ color: EMBER, fontWeight: "bold" }}
                />
                <Bar dataKey="count" fill={EMBER} radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        <BentoCard className="md:col-span-2">
          <SectionLabel icon={PieChartIcon}>Inventário</SectionLabel>
          {conditionData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-xs text-neutral-500 italic">Sem dados disponíveis</div>
          ) : (
            <>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={conditionData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={45} 
                      outerRadius={65} 
                      paddingAngle={4} 
                      dataKey="value" 
                      stroke="none"
                    >
                      {conditionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#171717", 
                        border: "1px solid rgba(255,255,255,0.05)", 
                        borderRadius: "12px", 
                        color: "#fafaf9", 
                        fontSize: "11px"
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {conditionData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider">
                    <span className="flex items-center gap-2 text-neutral-500">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </BentoCard>
      </div>

      {/* ─── ROW 3 — CVA + Manutenções + Envios atrasados ──────────── */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-6">
        {/* CVA Alerts */}
        <BentoCard className="md:col-span-2">
          <SectionLabel icon={AlertTriangle} tone="warn" count={cvaAlerts.length}>Documentação CVA</SectionLabel>
          {cvaAlerts.length === 0 ? (
            <EmptyState icon={CheckCircle2} label="Tudo em dia com as CVAs." />
          ) : (
            <ul className="space-y-3">
              {cvaAlerts.slice(0, 4).map((a: any) => (
                <li key={a.id} className="flex items-center justify-between rounded-xl border border-white/[0.03] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-white">{a.prefix}</p>
                    <p className="truncate text-[10px] font-medium uppercase tracking-tight text-neutral-500">{a.model || "—"}</p>
                  </div>
                  <UrgencyChip days={a.daysLeft} />
                </li>
              ))}
            </ul>
          )}
        </BentoCard>

        {/* Upcoming maintenance */}
        <BentoCard className="md:col-span-2">
          <SectionLabel icon={Wrench} tone="ember" count={upcomingMx.length}>Cronograma de MX</SectionLabel>
          {upcomingMx.length === 0 ? (
            <EmptyState icon={CheckCircle2} label="Nenhuma manutenção pendente." />
          ) : (
            <ul className="space-y-3">
              {upcomingMx.map((m: any) => (
                <li key={m.id} className="flex items-center justify-between rounded-xl border border-white/[0.03] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]">
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-sm font-semibold text-white">{m.description || m.item_type}</p>
                    <p className="font-mono text-[10px] uppercase text-[#e85d3a]">{m.aircraft_prefix || m.aircraft?.prefix || "—"}</p>
                  </div>
                  <UrgencyChip days={m.daysLeft} />
                </li>
              ))}
            </ul>
          )}
        </BentoCard>

        {/* Late shipments */}
        <BentoCard className="md:col-span-2">
          <SectionLabel icon={Package} tone="ember" count={lateShipments.length}>Logística Reversa</SectionLabel>
          {lateShipments.length === 0 ? (
            <EmptyState icon={CheckCircle2} label="Logística de envios regularizada." />
          ) : (
            <ul className="space-y-3">
              {lateShipments.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between rounded-xl border border-[#e85d3a]/10 bg-[#e85d3a]/[0.03] p-3 transition-colors hover:bg-[#e85d3a]/[0.05]">
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-sm font-semibold text-white">{s.part_name}</p>
                    <p className="truncate font-mono text-[10px] uppercase text-neutral-500">
                      {s.aircraft?.prefix}{s.destination_workshop ? ` · ${s.destination_workshop}` : ""}
                    </p>
                  </div>
                  <div className="flex h-8 w-12 items-center justify-center rounded-lg bg-[#e85d3a] text-[10px] font-bold text-white shadow-[0_0_15px_-5px_#e85d3a]">
                    {s.daysLate}d
                  </div>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>
      </div>

      {/* ─── ROW 4 — Atividade recente + Atalhos ───────────────────── */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-6">
        <BentoCard className="md:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-500/10">
                <Activity className="h-3.5 w-3.5" />
              </div>
              Atividade recente
            </div>
            <Link to="/services" className="text-[10px] font-bold uppercase tracking-wider text-[#e85d3a] hover:underline">
              Ver histórico →
            </Link>
          </div>
          {recentServices.length === 0 ? (
            <EmptyState icon={Activity} label="Nenhum serviço registrado ainda." />
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {recentServices.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e85d3a]/10 text-[#e85d3a]">
                      <Wrench className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{s.service_type}</p>
                      <p className="text-[11px] text-[#a8a29e]">
                        <span className="font-mono">{s.aircraft?.prefix || s.aircraft_prefix || "—"}</span>
                        {s.performed_at && ` · ${format(parseISO(s.performed_at), "dd/MM/yyyy", { locale: ptBR })}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={s.status === "completed" ? "default" : "outline"} className="text-[10px]">
                    {s.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>

        <BentoCard className="md:col-span-2">
          <SectionLabel icon={ArrowUpRight}>Atalhos</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <QuickLink to="/aircraft" icon={Plane} label="Frota" />
            <QuickLink to="/services" icon={Wrench} label="Manutenção" />
            <QuickLink to="/parts" icon={Cog} label="Estoque" />
            <QuickLink to="/library" icon={BookMarked} label="Biblioteca" />
          </div>
        </BentoCard>
      </div>
    </>
  );
}

// ─── Small atoms ───────────────────────────────────────────────────────

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="relative">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-500">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums text-white">
        {typeof value === "number" ? String(value).padStart(2, "0") : value}
      </p>
    </div>
  );
}

function EmptyState({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/5 text-emerald-500/50 ring-1 ring-inset ring-emerald-500/10">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-4 text-xs font-medium text-neutral-500">{label}</p>
    </div>
  );
}

function UrgencyChip({ days }: { days: number }) {
  const critical = days <= 15;
  const overdue = days < 0;
  
  return (
    <div className={cn(
      "flex h-8 min-w-[3rem] items-center justify-center rounded-lg px-2 font-mono text-[11px] font-bold shadow-sm ring-1 ring-inset",
      overdue || critical 
        ? "bg-[#e85d3a] text-white ring-[#e85d3a]/20" 
        : "bg-white/[0.03] text-neutral-400 ring-white/10"
    )}>
      {overdue ? `${Math.abs(days)}d↑` : `${days}d`}
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to as any}
      className="group/q flex items-center gap-3 rounded-xl bg-white/[0.02] p-4 transition-all duration-300 ring-1 ring-inset ring-white/[0.05] hover:bg-[#e85d3a]/[0.08] hover:ring-[#e85d3a]/30"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.03] text-neutral-400 transition-all duration-300 group-hover/q:bg-[#e85d3a] group-hover/q:text-white group-hover/q:shadow-[0_0_20px_-5px_#e85d3a]">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[13px] font-bold text-neutral-300 group-hover/q:text-white transition-colors">{label}</span>
    </Link>
  );
}
