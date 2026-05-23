import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
 import { Plane, Wrench, Cog, AlertTriangle, CheckCircle2, Clock, TrendingUp, BookMarked, History, BarChart3, PieChart as PieChartIcon, LayoutPanelLeft } from "lucide-react";
 import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { cn } from "@/lib/utils";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useAircraft, useServices, useParts, useMaintenanceItems, useFlightLogs, useShipments } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { differenceInDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/dashboard")({
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

function DashboardContent() {
  const { data: aircraft = [] } = useAircraft();
  const { data: services = [] } = useServices();
  const { data: parts = [] } = useParts();
  const { data: mx = [] } = useMaintenanceItems();
  const { data: logs = [] } = useFlightLogs();
  const { data: shipments = [] } = useShipments();

  const activeAircraft = aircraft.filter((a: any) => a.status === "active").length;
  const inMaintenance = aircraft.filter((a: any) => a.status === "maintenance").length;
  const pendingServices = services.filter((s: any) => s.status === "pending" || s.status === "in_progress").length;
  const installedParts = parts.filter((p: any) => p.status === "installed").length;

  // CVA alerts: vencidas ou a vencer em 30 dias
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
    .slice(0, 6);

  const lateShipments = shipments
    .filter((s: any) => s.status !== "received" && s.status !== "cancelled" && s.estimated_return_date)
    .map((s: any) => ({ ...s, daysLate: differenceInDays(today, parseISO(s.estimated_return_date)) }))
    .filter((s: any) => s.daysLate > 0)
    .sort((a: any, b: any) => b.daysLate - a.daysLate)
    .slice(0, 6);

  const recentServices = services.slice(0, 5);

   const totalFlightHours = aircraft.reduce((sum: number, a: any) => sum + Number(a.total_hours || 0), 0);
   const stockValue = parts.reduce((sum: number, p: any) => sum + (Number(p.unit_price) || 0), 0);
 
   // Chart Data: Services by month
   const last6Months = [...Array(6)].map((_, i) => {
     const d = new Date();
     d.setMonth(d.getMonth() - i);
     return {
       month: format(d, "MMM", { locale: ptBR }),
        count: services.filter(s => {
          if (!s.performed_at) return false;
          const sd = parseISO(s.performed_at);
          return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
        }).length,
       rawDate: d
     };
   }).reverse();
 
   // Chart Data: Parts by condition
   const conditionData = [
     { name: "Novo", value: parts.filter(p => p.condition === "new").length, color: "#10b981" },
     { name: "Serviçável", value: parts.filter(p => p.condition === "serviceable").length, color: "#0ea5e9" },
     { name: "Reparo", value: parts.filter(p => p.condition === "repairable" || p.condition === "unserviceable").length, color: "#f59e0b" },
      { name: "Outros", value: parts.filter(p => !["new", "serviceable", "repairable", "unserviceable"].includes(p.condition || "")).length, color: "#64748b" },
   ].filter(d => d.value > 0);
 
   const monthlyFlights = logs.filter((l: any) => {
     if (!l.date) return false;
     const d = parseISO(l.date);
     return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
   }).length;

    const kpis = [
      { label: "Frota Ativa", value: activeAircraft, total: aircraft.length, icon: Plane, to: "/aircraft", color: "text-blue-400" },
      { label: "Horas Totais", value: `${totalFlightHours.toFixed(1)}h`, icon: Clock, to: "/aircraft", color: "text-primary" },
      { label: "Valor em Estoque", value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stockValue), icon: TrendingUp, to: "/parts", color: "text-emerald-400" },
      { label: "Manutenção", value: inMaintenance, icon: Wrench, to: "/aircraft", color: "text-amber-400" },
    ];
        {/* Charts Section */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 glass-card border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
                <BarChart3 className="h-4 w-4 text-primary" /> Histórico de Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[280px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last6Months}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.74 0.142 78)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="oklch(0.74 0.142 78)" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ backgroundColor: "#0c111d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)" }}
                    itemStyle={{ color: "oklch(0.74 0.142 78)", fontSize: "12px", fontWeight: "bold" }}
                  />
                  <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
  
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
                <PieChartIcon className="h-4 w-4 text-primary" /> Categorias de Peças
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[280px] flex flex-col items-center justify-center">
              <div className="relative h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={conditionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {conditionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0c111d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold tracking-tight">{parts.length}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Itens</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 w-full px-2">
                {conditionData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-tighter">{d.name}</span>
                    <span className="ml-auto text-[10px] font-bold text-foreground/80">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
 

  return (
    <>
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="font-display text-4xl font-extrabold tracking-tight gold-text">Dashboard</h1>
        <p className="text-muted-foreground max-w-2xl">
          Bem-vindo ao centro de comando do <span className="text-foreground font-semibold">FlightCore</span>. 
          Acompanhe o status da sua frota e alertas operacionais em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} to={k.to} className="group">
            <Card className="glass-card glass-card-hover border-white/5 h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 transition-transform duration-500 group-hover:rotate-12", k.color)}>
                    <k.icon className="h-6 w-6" />
                  </div>
                  {k.total !== undefined && (
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] uppercase tracking-wider">
                      {k.total} Total
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{k.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold tracking-tight">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

       <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CVA Alerts */}
        <Card className="border-white/5 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Alertas CVA
            </CardTitle>
            <Badge variant="outline" className="text-xs">{cvaAlerts.length}</Badge>
          </CardHeader>
          <CardContent>
            {cvaAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <p className="mt-2 text-sm text-muted-foreground">Nenhuma CVA próxima do vencimento.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {cvaAlerts.slice(0, 6).map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-background/40 px-3 py-2">
                    <div>
                      <p className="font-mono text-sm font-semibold">{a.prefix}</p>
                      <p className="text-xs text-muted-foreground">{a.model || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{format(parseISO(a.cva_expiration), "dd/MM/yyyy", { locale: ptBR })}</p>
                      <Badge variant={a.daysLeft < 0 ? "destructive" : a.daysLeft <= 15 ? "destructive" : "outline"} className="mt-1 text-[10px]">
                        {a.daysLeft < 0 ? `${Math.abs(a.daysLeft)}d vencida` : `${a.daysLeft}d restantes`}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming maintenance */}
        <Card className="border-white/5 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-primary" /> Manutenções próximas
            </CardTitle>
            <Badge variant="outline" className="text-xs">{upcomingMx.length}</Badge>
          </CardHeader>
          <CardContent>
            {upcomingMx.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum item próximo do vencimento.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingMx.map((m: any) => (
                  <li key={m.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-background/40 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{m.description || m.item_type}</p>
                      <p className="text-xs text-muted-foreground font-mono">{m.aircraft_prefix || m.aircraft?.prefix || "—"}</p>
                    </div>
                    <Badge variant={m.daysLeft < 0 ? "destructive" : m.daysLeft <= 15 ? "destructive" : "outline"} className="text-[10px]">
                      {m.daysLeft < 0 ? `${Math.abs(m.daysLeft)}d vencido` : `${m.daysLeft}d`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent services */}
      <Card className="mt-6 border-white/5 bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-red-400" /> Peças com retorno atrasado
          </CardTitle>
          <Badge variant={lateShipments.length ? "destructive" : "outline"} className="text-xs">{lateShipments.length}</Badge>
        </CardHeader>
        <CardContent>
          {lateShipments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma peça atrasada.</p>
          ) : (
            <ul className="space-y-2">
              {lateShipments.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.part_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {s.aircraft?.prefix}{s.destination_workshop ? ` · ${s.destination_workshop}` : ""}
                    </p>
                  </div>
                  <Badge variant="destructive" className="text-[10px] shrink-0 ml-2">{s.daysLate}d atrasado</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-white/5 bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-primary" /> Serviços recentes
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/services">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentServices.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum serviço registrado ainda.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentServices.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{s.service_type}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{s.aircraft?.prefix || s.aircraft_prefix || "—"}</span>
                      {s.performed_at && ` · ${format(parseISO(s.performed_at), "dd/MM/yyyy", { locale: ptBR })}`}
                    </p>
                  </div>
                  <Badge variant={s.status === "completed" ? "default" : "outline"} className="text-[10px]">
                    {s.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <QuickLink to="/aircraft" icon={Plane} label="Frota" />
        <QuickLink to="/flight-logs" icon={History} label="Diário" />
        <QuickLink to="/services" icon={Wrench} label="Manutenção" />
        <QuickLink to="/parts" icon={Cog} label="Estoque" />
        <QuickLink to="/library" icon={BookMarked} label="Biblioteca" />
      </div>
    </>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to as any} className="group flex items-center gap-3 rounded-xl border border-white/5 bg-card/40 p-4 transition hover:border-primary/40 hover:bg-card/70">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}