import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plane, Wrench, Cog, AlertTriangle, CheckCircle2, TrendingUp,
  BookMarked, BarChart3, PieChart as PieChartIcon, ArrowUpRight, Activity,
  Package,
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
 * Paleta local: Institucional FlightCore (#245A7A / #17212B / #F4F5F6).
 * Tipografia: Inter (global), já carregada.
 */

const EMBER = "#245A7A";
const EMBER_SOFT = "#2F7196";

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
    "group relative overflow-hidden rounded-md border transition-all duration-200",
    "bg-card text-card-foreground",
    accent
      ? "border-primary"
      : "border-border hover:border-primary/50",
    to && "hover:-translate-y-0.5",
    className,
  );
  const content = (
    <>
      {accent && (
        <div className="absolute left-0 top-0 w-1 h-full bg-primary" />
      )}
      <div className="relative p-5">{children}</div>
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
    default: "text-muted-foreground",
    ember: "text-primary",
    warn: "text-[#C58A21]",
    ok: "text-[#37805A]",
  }[tone];
  
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className={cn("flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.2em]", toneClass)}>
        <div className={cn("flex h-6 w-6 items-center justify-center rounded bg-current/10 border border-current/10")}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        {children}
      </div>
      {typeof count === "number" && count > 0 && (
        <span className="flex h-5 items-center rounded-full bg-accent px-2 font-mono text-[10px] text-text-sec border border-border">
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
    { name: "Novo", value: parts.filter((p: any) => p.condition === "new").length, color: "#245A7A" },
    { name: "Serviçável", value: parts.filter((p: any) => p.condition === "serviceable").length, color: "#22c55e" },
    { name: "Reparo", value: parts.filter((p: any) => p.condition === "repairable" || p.condition === "unserviceable").length, color: "#dc2626" },
    { name: "Outros", value: parts.filter((p: any) => !["new", "serviceable", "repairable", "unserviceable"].includes(p.condition || "")).length, color: "#71717a" },
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

              <p className="font-sans text-8xl font-bold tracking-tighter text-foreground tabular-nums leading-none">
                {String(activeAircraft).padStart(2, "0")}
              </p>
              <p className="mt-3 text-[10px] font-bold text-text-sec uppercase tracking-[0.2em]">
                Aeronaves operacionais
              </p>
            </div>
            <div className="hidden h-16 w-16 items-center justify-center rounded bg-primary/5 text-primary border border-primary/20 sm:flex">
              <Plane className="h-8 w-8 transition-transform duration-500 group-hover:scale-110" />
            </div>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-8">
            <MiniStat label="Manutenção" value={inMaintenance} />
            <MiniStat label="Instaladas" value={installedParts} />
            <MiniStat label="Serviços" value={pendingServices} />
          </div>
          <div className="mt-8 flex items-center justify-between text-[10px] font-bold tracking-[0.2em] text-primary opacity-0 transition-all duration-300 group-hover:opacity-100">
            <span>RELATÓRIO DE FROTA</span>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </BentoCard>

        {/* Alertas críticos (3 cols) — destaque ember */}
        <BentoCard accent className="md:col-span-3">
          <SectionLabel icon={AlertTriangle} tone="ember">Status de Atenção</SectionLabel>
          <div className="flex items-center gap-8">
            <div className="relative">

              <p className="relative font-sans text-7xl font-bold tracking-tighter tabular-nums text-[#B94A48]">
                {totalAlerts}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-foreground tabular-nums">
                {criticalAlerts} <span className="text-[10px] font-bold text-text-sec uppercase tracking-[0.2em]">Críticos</span>
              </p>
              <p className="text-[10px] text-text-sec font-bold uppercase tracking-wider">Ações imediatas</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded bg-accent/50 p-3 border border-border">
              <p className="text-[10px] font-bold text-text-sec uppercase tracking-widest">CVA</p>
              <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{cvaAlerts.length}</p>
            </div>
            <div className="rounded bg-accent/50 p-3 border border-border">
              <p className="text-[10px] font-bold text-text-sec uppercase tracking-widest">Envios</p>
              <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{lateShipments.length}</p>
            </div>
          </div>
        </BentoCard>

        {/* Valor estoque (3 cols) */}
        <BentoCard to="/parts" className="md:col-span-3">
          <SectionLabel icon={TrendingUp}>Ativos em Estoque</SectionLabel>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-text-sec">BRL</span>
            <p className="font-sans text-4xl font-bold tracking-tighter text-foreground tabular-nums">
              {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(stockValue)}
            </p>
          </div>
          <p className="mt-2 text-[10px] font-bold text-text-sec uppercase tracking-wider">{parts.length} componentes</p>
          <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-accent">
            <div className="h-full bg-primary" style={{ width: "65%" }} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" className="opacity-30" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="var(--text-sec)" 

                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ dy: 10 }}
                />
                <YAxis 
                  stroke="var(--text-sec)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false}
                  tick={{ dx: -10 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  contentStyle={{ 
                    backgroundColor: "var(--card)", 
                    border: "1px solid var(--border)", 
                    borderRadius: "6px", 
                    color: "var(--text-main)", 
                    fontSize: "11px",
                    boxShadow: "none"
                  }}
                  itemStyle={{ color: "var(--primary)", fontWeight: "bold" }}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[2, 2, 0, 0]} barSize={24} />
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
                      backgroundColor: "var(--card)", 
                      border: "1px solid var(--border)", 
                      borderRadius: "6px", 
                      color: "var(--text-main)", 
                      fontSize: "11px",
                      boxShadow: "none"
                    }} 
                  />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {conditionData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider">
                    <span className="flex items-center gap-2 text-text-sec">
                      <span className="h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="text-foreground tabular-nums">{d.value}</span>
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
                <li key={a.id} className="flex items-center justify-between rounded border border-border bg-accent/30 p-3 transition-colors hover:bg-accent/50">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-foreground">{a.prefix}</p>
                    <p className="truncate text-[10px] font-bold uppercase tracking-tight text-text-sec">{a.model || "—"}</p>
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
                <li key={m.id} className="flex items-center justify-between rounded border border-border bg-accent/30 p-3 transition-colors hover:bg-accent/50">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-foreground">{m.title}</p>
                    <p className="truncate text-[10px] font-bold uppercase tracking-tight text-text-sec">{m.aircraft_prefix || "—"}</p>
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
                <li key={s.id} className="flex items-center justify-between rounded border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                  <div className="min-w-0 pr-2">
                    <p className="truncate text-sm font-bold text-foreground">{s.part_name}</p>
                    <p className="truncate font-mono text-[10px] uppercase text-neutral-500">
                      {s.aircraft?.prefix}{s.destination_workshop ? ` · ${s.destination_workshop}` : ""}
                    </p>
                  </div>
                  <div className="flex h-7 px-2 items-center justify-center rounded bg-red-600 text-[10px] font-bold text-white">
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
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
                <Activity className="h-3.5 w-3.5" />
              </div>
              Atividade recente
            </div>
            <Link to="/services" className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline">
              Ver histórico →
            </Link>
          </div>
          {recentServices.length === 0 ? (
            <EmptyState icon={Activity} label="Nenhum serviço registrado ainda." />
          ) : (
            <ul className="divide-y divide-border">
              {recentServices.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                      <Wrench className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{s.service_type}</p>
                      <p className="text-[10px] font-bold uppercase tracking-tight text-text-sec">
                        <span className="font-mono">{s.aircraft?.prefix || s.aircraft_prefix || "—"}</span>
                        {s.performed_at && ` · ${format(parseISO(s.performed_at), "dd/MM/yyyy", { locale: ptBR })}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={s.status === "completed" ? "default" : "outline"} className="text-[10px] rounded">
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
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-sec">{label}</p>
      <p className="mt-2 font-sans text-3xl font-bold tabular-nums text-foreground">
        {typeof value === "number" ? String(value).padStart(2, "0") : value}
      </p>
    </div>
  );
}

function EmptyState({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded bg-green-500/5 text-green-500/50 border border-green-500/10">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-text-sec">{label}</p>
    </div>
  );
}

function UrgencyChip({ days }: { days: number }) {
  const critical = days <= 15;
  const overdue = days < 0;
  
  return (
    <div className={cn(
      "flex h-7 min-w-[3rem] items-center justify-center rounded px-2 font-mono text-[11px] font-bold border",
      overdue || critical 
        ? "bg-[#B94A48] text-white border-[#B94A48]/20" 
        : "bg-accent/50 text-text-sec border-border"
    )}>
      {overdue ? `${Math.abs(days)}d↑` : `${days}d`}
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to as any}
      className="group/q flex items-center gap-3 rounded bg-muted/30 p-4 transition-all duration-200 border border-border hover:bg-primary/5 hover:border-primary/30"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded bg-muted text-muted-foreground transition-all duration-200 group-hover/q:bg-primary group-hover/q:text-white">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[13px] font-bold text-foreground transition-colors">{label}</span>
    </Link>
  );
}
