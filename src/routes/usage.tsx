import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
 import { DollarSign, HardDrive, Database, TrendingUp } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { COSTS, fmtBytes, fmtUSD, bytesToGB } from "@/lib/usage-tracking";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/usage")({
  component: () => <AuthGuard><UsagePage /></AuthGuard>,
});

const FREE_CLOUD = 25;
const FREE_AI = 1;

function UsagePage() {
  const { user } = useAuth();

  const { data: events = [] } = useQuery({
    queryKey: ["usage_events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usage_events")
        .select("*")
        .gte("created_at", subDays(new Date(), 30).toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Estimativas retroativas das tabelas existentes
  const { data: counts } = useQuery({
    queryKey: ["usage_counts", user?.id],
    queryFn: async () => {
      const [a, s, p, d, m] = await Promise.all([
        supabase.from("aircraft").select("id", { count: "exact", head: true }),
        supabase.from("services").select("id", { count: "exact", head: true }),
        supabase.from("parts").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("maintenance_items").select("id", { count: "exact", head: true }),
      ]);
      return {
        aircraft: a.count || 0,
        services: s.count || 0,
        parts: p.count || 0,
        documents: d.count || 0,
        maintenance: m.count || 0,
      };
    },
  });

  // Série diária dos últimos 30 dias
  const series = useMemo(() => {
    const days: Record<string, { date: string; uploadsMB: number; aiCalls: number; cost: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const k = format(d, "yyyy-MM-dd");
      days[k] = { date: format(d, "dd/MM", { locale: ptBR }), uploadsMB: 0, aiCalls: 0, cost: 0 };
    }
    events.forEach((e: any) => {
      const k = format(startOfDay(new Date(e.created_at)), "yyyy-MM-dd");
      if (!days[k]) return;
      if (e.category === "storage") days[k].uploadsMB += (e.bytes || 0) / (1024 * 1024);
      if (e.category === "ai") days[k].aiCalls += Number(e.units || 1);
      days[k].cost += Number(e.estimated_cost_usd || 0);
    });
    return Object.values(days);
  }, [events]);

  const totals = useMemo(() => {
    const storageBytes = events
      .filter((e: any) => e.category === "storage")
      .reduce((sum: number, e: any) => sum + Number(e.bytes || 0), 0);
    const aiCalls = events.filter((e: any) => e.category === "ai").length;
    const cost = events.reduce((sum: number, e: any) => sum + Number(e.estimated_cost_usd || 0), 0);
    const dbRecords =
      (counts?.aircraft || 0) +
      (counts?.services || 0) +
      (counts?.parts || 0) +
      (counts?.documents || 0) +
      (counts?.maintenance || 0);
    return { storageBytes, aiCalls, cost, dbRecords };
  }, [events, counts]);

  const cloudUsedPct = Math.min(100, (totals.cost / FREE_CLOUD) * 100);
  const aiCostEstimate = events
    .filter((e: any) => e.category === "ai")
    .reduce((s: number, e: any) => s + Number(e.estimated_cost_usd || 0), 0);
  const aiUsedPct = Math.min(100, (aiCostEstimate / FREE_AI) * 100);

  const dbBreakdown = counts
    ? [
        { name: "Aeronaves", value: counts.aircraft },
        { name: "Serviços", value: counts.services },
        { name: "Peças", value: counts.parts },
        { name: "Documentos", value: counts.documents },
        { name: "Manutenção", value: counts.maintenance },
      ]
    : [];

  return (
    <AppShell>
      <PageHeader
         title="Custos e Uso"
         description="Acompanhe o uso de armazenamento e banco de dados dos últimos 30 dias."
       />

      {/* KPIs */}
       <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Custo estimado (30d)"
          value={fmtUSD(totals.cost)}
          hint={`Saldo grátis Cloud: ${fmtUSD(FREE_CLOUD)}/mês`}
          accent="primary"
        />
        <KpiCard
          icon={<HardDrive className="h-4 w-4" />}
          label="Uploads (30d)"
          value={fmtBytes(totals.storageBytes)}
          hint={`${bytesToGB(totals.storageBytes).toFixed(3)} GB`}
        />
        <KpiCard
          icon={<Database className="h-4 w-4" />}
          label="Registros no DB"
          value={String(totals.dbRecords)}
          hint="Total acumulado"
        />
      </div>

      {/* Saldo grátis */}
      <Card className="mt-6 border-white/5 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" /> Saldo gratuito do mês
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressBar
            label="Lovable Cloud (storage + DB)"
            used={totals.cost}
            total={FREE_CLOUD}
            pct={cloudUsedPct}
          />
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Uploads por dia (MB)" icon={<HardDrive className="h-4 w-4" />}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="gUpload" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.74 0.142 78)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.74 0.142 78)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
              <XAxis dataKey="date" stroke="oklch(0.7 0 0)" fontSize={11} />
              <YAxis stroke="oklch(0.7 0 0)" fontSize={11} />
              <Tooltip contentStyle={chartTooltip} />
              <Area type="monotone" dataKey="uploadsMB" stroke="oklch(0.74 0.142 78)" strokeWidth={2} fill="url(#gUpload)" name="MB" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>


        <ChartCard title="Custo diário estimado (US$)" icon={<DollarSign className="h-4 w-4" />}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
              <XAxis dataKey="date" stroke="oklch(0.7 0 0)" fontSize={11} />
              <YAxis stroke="oklch(0.7 0 0)" fontSize={11} />
              <Tooltip contentStyle={chartTooltip} formatter={(v: any) => fmtUSD(Number(v))} />
              <Line type="monotone" dataKey="cost" stroke="oklch(0.78 0.16 150)" strokeWidth={2} dot={false} name="USD" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Banco de dados por categoria" icon={<Database className="h-4 w-4" />}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dbBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.08)" />
              <XAxis type="number" stroke="oklch(0.7 0 0)" fontSize={11} />
              <YAxis dataKey="name" type="category" stroke="oklch(0.7 0 0)" fontSize={11} width={90} />
              <Tooltip contentStyle={chartTooltip} />
              <Bar dataKey="value" fill="oklch(0.7 0.14 220)" radius={[0, 4, 4, 0]} name="Registros" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        💡 Os custos são estimativas baseadas nas tabelas públicas de preço do Lovable Cloud e do AI Gateway. Valores reais podem variar — consulte <strong>Settings → Workspace → Usage</strong> para a fatura oficial.
      </p>
    </AppShell>
  );
}

const chartTooltip = {
  background: "oklch(0.18 0.02 255)",
  border: "1px solid oklch(1 0 0 / 0.1)",
  borderRadius: 8,
  fontSize: 12,
};

function KpiCard({ icon, label, value, hint, accent }: { icon: React.ReactNode; label: string; value: string; hint?: string; accent?: "primary" }) {
  return (
    <Card className={`border-white/5 bg-card/60 backdrop-blur ${accent === "primary" ? "ring-1 ring-primary/30" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <p className="text-[10px] uppercase tracking-wider">{label}</p>
        </div>
        <p className="mt-2 font-display text-2xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ProgressBar({ label, used, total, pct }: { label: string; used: number; total: number; pct: number }) {
  const isHigh = pct > 80;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant={isHigh ? "destructive" : "outline"} className="text-[10px]">
          {fmtUSD(used)} / {fmtUSD(total)}
        </Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: isHigh
              ? "linear-gradient(90deg, oklch(0.7 0.2 25), oklch(0.65 0.22 15))"
              : "linear-gradient(90deg, oklch(0.74 0.142 78), oklch(0.86 0.11 86))",
          }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{pct.toFixed(1)}% usado</p>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="border-white/5 bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
