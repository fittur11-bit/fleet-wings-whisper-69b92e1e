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
    "group relative overflow-hidden rounded-2xl border bg-[#1a1a1a] p-5 transition-all duration-300",
    accent
      ? "border-[#e85d3a]/40 shadow-[0_0_0_1px_rgba(232,93,58,0.08),0_20px_60px_-30px_rgba(232,93,58,0.6)]"
      : "border-white/[0.06] hover:border-[#e85d3a]/30 hover:shadow-[0_20px_60px_-30px_rgba(232,93,58,0.4)]",
    className,
  );
  const content = (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative">{children}</div>
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

function SectionLabel({ icon: Icon, children, tone = "default", count }: { icon: any; children: React.ReactNode; tone?: "default" | "ember" | "warn" | "ok"; count?: number }) {
  const toneClass = {
    default: "text-[#a8a29e]",
    ember: "text-[#e85d3a]",
    warn: "text-amber-400",
    ok: "text-emerald-400",
  }[tone];
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className={cn("flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]", toneClass)}>
        <Icon className="h-3.5 w-3.5" />
        {children}
      </div>
      {typeof count === "number" && (
        <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] text-[#a8a29e]">{count}</span>
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
            <div>
              <p className="font-display text-7xl font-bold tracking-tighter text-white tabular-nums">
                {String(activeAircraft).padStart(2, "0")}
              </p>
              <p className="mt-2 text-sm text-[#a8a29e]">
                de <span className="font-mono text-white">{aircraft.length}</span> aeronaves operacionais
              </p>
            </div>
            <div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-[#e85d3a]/10 text-[#e85d3a] sm:flex">
              <Plane className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-5">
            <MiniStat label="Em manutenção" value={inMaintenance} />
            <MiniStat label="Peças instaladas" value={installedParts} />
            <MiniStat label="Serviços ativos" value={pendingServices} />
          </div>
          <div className="mt-5 flex items-center justify-between text-xs">
            <span className="text-[#a8a29e]">Ver detalhes da frota</span>
            <ArrowUpRight className="h-4 w-4 text-[#e85d3a] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </BentoCard>

        {/* Horas Totais (2 cols) */}
        <BentoCard to="/aircraft" className="md:col-span-2">
          <SectionLabel icon={Clock}>Horas Totais</SectionLabel>
          <p className="font-display text-4xl font-bold tracking-tight text-white tabular-nums">
            {totalFlightHours.toFixed(1)}<span className="text-xl text-[#a8a29e]">h</span>
          </p>
          <p className="mt-1 text-xs text-[#a8a29e]">consolidado da frota</p>
        </BentoCard>

        {/* Alertas críticos (1 col) — destaque ember */}
        <BentoCard accent className="md:col-span-1">
          <SectionLabel icon={AlertTriangle} tone="ember">Alertas</SectionLabel>
          <p className="font-display text-4xl font-bold tracking-tight tabular-nums" style={{ color: EMBER }}>
            {totalAlerts}
          </p>
          <p className="mt-1 text-xs text-[#f5c0a8]">
            <span className="font-semibold">{criticalAlerts}</span> crítico(s)
          </p>
        </BentoCard>

        {/* Valor estoque (2 cols) */}
        <BentoCard to="/parts" className="md:col-span-2">
          <SectionLabel icon={TrendingUp}>Valor em Estoque</SectionLabel>
          <p className="font-display text-3xl font-bold tracking-tight text-white tabular-nums">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(stockValue)}
          </p>
          <p className="mt-1 text-xs text-[#a8a29e]">{parts.length} itens cadastrados</p>
        </BentoCard>

        {/* Saúde geral (1 col) */}
        <BentoCard className="md:col-span-1">
          <SectionLabel icon={ShieldCheck} tone={criticalAlerts === 0 ? "ok" : "warn"}>Saúde</SectionLabel>
          <p className="font-display text-3xl font-bold tracking-tight tabular-nums text-white">
            {Math.max(0, Math.round(100 - (criticalAlerts * 12 + (totalAlerts - criticalAlerts) * 4))).toString()}
            <span className="text-base text-[#a8a29e]">%</span>
          </p>
          <p className="mt-1 text-xs text-[#a8a29e]">índice operacional</p>
        </BentoCard>
      </div>

      {/* ─── ROW 2 — Gráficos ──────────────────────────────────────── */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-6">
        <BentoCard className="md:col-span-4">
          <SectionLabel icon={BarChart3} tone="ember">Tendência de Manutenção · 6 meses</SectionLabel>
          <div className="h-[220px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last6Months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" className="opacity-[0.05]" vertical={false} />
                <XAxis dataKey="month" stroke="#a8a29e" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#a8a29e" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "rgba(232,93,58,0.06)" }}
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid rgba(232,93,58,0.3)", borderRadius: "10px", color: "#fafaf9", fontSize: "12px" }}
                  itemStyle={{ color: EMBER }}
                />
                <Bar dataKey="count" fill={EMBER} radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </BentoCard>

        <BentoCard className="md:col-span-2">
          <SectionLabel icon={PieChartIcon}>Estoque por Condição</SectionLabel>
          {conditionData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-xs text-[#a8a29e]">Sem dados</div>
          ) : (
            <>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={conditionData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value" stroke="none">
                      {conditionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid rgba(232,93,58,0.3)", borderRadius: "10px", color: "#fafaf9", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {conditionData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-2 text-[#a8a29e]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-mono text-white">{d.value}</span>
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
          <SectionLabel icon={AlertTriangle} tone="warn" count={cvaAlerts.length}>CVA</SectionLabel>
          {cvaAlerts.length === 0 ? (
            <EmptyState icon={CheckCircle2} label="Nenhuma CVA próxima do vencimento." />
          ) : (
            <ul className="space-y-2">
              {cvaAlerts.slice(0, 4).map((a: any) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#2d2d2d]/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-white">{a.prefix}</p>
                    <p className="truncate text-[11px] text-[#a8a29e]">{a.model || "—"}</p>
                  </div>
                  <UrgencyChip days={a.daysLeft} />
                </li>
              ))}
            </ul>
          )}
        </BentoCard>

        {/* Upcoming maintenance */}
        <BentoCard className="md:col-span-2">
          <SectionLabel icon={Wrench} tone="ember" count={upcomingMx.length}>Manutenções</SectionLabel>
          {upcomingMx.length === 0 ? (
            <EmptyState icon={CheckCircle2} label="Nenhum item próximo do vencimento." />
          ) : (
            <ul className="space-y-2">
              {upcomingMx.map((m: any) => (
                <li key={m.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#2d2d2d]/40 px-3 py-2">
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-sm font-medium text-white">{m.description || m.item_type}</p>
                    <p className="font-mono text-[11px] text-[#a8a29e]">{m.aircraft_prefix || m.aircraft?.prefix || "—"}</p>
                  </div>
                  <UrgencyChip days={m.daysLeft} />
                </li>
              ))}
            </ul>
          )}
        </BentoCard>

        {/* Late shipments */}
        <BentoCard className="md:col-span-2">
          <SectionLabel icon={Package} tone="ember" count={lateShipments.length}>Envios atrasados</SectionLabel>
          {lateShipments.length === 0 ? (
            <EmptyState icon={CheckCircle2} label="Nenhuma peça atrasada." />
          ) : (
            <ul className="space-y-2">
              {lateShipments.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg border border-[#e85d3a]/20 bg-[#e85d3a]/[0.06] px-3 py-2">
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-sm font-medium text-white">{s.part_name}</p>
                    <p className="truncate font-mono text-[11px] text-[#a8a29e]">
                      {s.aircraft?.prefix}{s.destination_workshop ? ` · ${s.destination_workshop}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold text-white" style={{ backgroundColor: EMBER }}>
                    {s.daysLate}d
                  </span>
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
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a8a29e]">
              <Activity className="h-3.5 w-3.5" />
              Atividade recente
            </div>
            <Link to="/services" className="text-[11px] font-medium text-[#e85d3a] hover:underline">
              Ver todos →
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
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[#a8a29e]">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Icon className="h-7 w-7 text-emerald-400/70" />
      <p className="mt-2 text-xs text-[#a8a29e]">{label}</p>
    </div>
  );
}

function UrgencyChip({ days }: { days: number }) {
  const critical = days <= 15;
  const overdue = days < 0;
  const bg = overdue || critical ? "bg-[#e85d3a]" : "bg-white/10";
  const fg = overdue || critical ? "text-white" : "text-[#a8a29e]";
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold", bg, fg)}>
      {overdue ? `${Math.abs(days)}d↑` : `${days}d`}
    </span>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to as any}
      className="group/q flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#2d2d2d]/50 p-3 transition-all hover:border-[#e85d3a]/40 hover:bg-[#e85d3a]/[0.06]"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e85d3a]/10 text-[#e85d3a] transition-all group-hover/q:bg-[#e85d3a] group-hover/q:text-white">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-xs font-medium text-white">{label}</span>
    </Link>
  );
}
