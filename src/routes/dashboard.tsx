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
          <Card className="lg:col-span-2 glass-card border-white/5 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <BarChart3 className="h-24 w-24" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary/70">
                <BarChart3 className="h-4 w-4" /> Histórico de Manutenção
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last6Months}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.74 0.142 78)" stopOpacity={1} />
                      <stop offset="100%" stopColor="oklch(0.74 0.142 78)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#ffffff20" 
                    fontSize={10} 
                    fontWeight={700}
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#ffffff20" 
                    fontSize={10} 
                    fontWeight={700}
                    tickLine={false} 
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ 
                      backgroundColor: "rgba(15, 20, 35, 0.9)", 
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.1)", 
                      borderRadius: "16px", 
                      boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)" 
                    }}
                    itemStyle={{ color: "oklch(0.74 0.142 78)", fontSize: "12px", fontWeight: "800" }}
                  />
                  <Bar dataKey="count" fill="url(#barGradient)" radius={[8, 8, 2, 2]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
  
          <Card className="glass-card border-white/5 group">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary/70">
                <PieChartIcon className="h-4 w-4" /> Categorias de Peças
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
    <div className="space-y-12 pb-10">
      <div className="relative p-10 lg:p-16 rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent overflow-hidden group">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent opacity-30 pointer-events-none" />
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all duration-1000" />
        
        <div className="relative z-10 flex flex-col gap-6 animate-in fade-in slide-in-from-left-4 duration-1000">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-[10px] font-black tracking-[0.2em] uppercase">
              Operação em Tempo Real
            </Badge>
            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-emerald-500/70">Sistemas Ativos</span>
          </div>
          
          <div className="space-y-2">
            <h1 className="font-display text-5xl font-black tracking-tighter gold-text sm:text-7xl lg:text-8xl">
              FlightCore
            </h1>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground/90">
              Gestão Estratégica de Frotas
            </h2>
          </div>
          
          <p className="text-muted-foreground/60 max-w-2xl text-lg font-medium leading-relaxed">
            Bem-vindo ao centro de comando. Monitore sua frota global com 
            precisão técnica e inteligência preditiva de nível aeroespacial.
          </p>

          <div className="flex flex-wrap gap-4 mt-4">
            <Button size="lg" className="rounded-full px-8 shadow-xl shadow-primary/20" asChild>
              <Link to="/aircraft">Explorar Frota</Link>
            </Button>
            <Button variant="outline" size="lg" className="rounded-full px-8 border-white/10" asChild>
              <Link to="/services">Ordens de Serviço</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Link 
            key={k.label} 
            to={k.to} 
            className="group animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <Card className="glass-card glass-card-hover border-white/5 h-full overflow-hidden">
              <CardContent className="p-7 relative">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />
                <div className="flex items-center justify-between mb-6">
                  <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/5 transition-all duration-700 group-hover:scale-110 group-hover:rotate-3 shadow-inner", k.color)}>
                    <k.icon className="h-7 w-7" />
                  </div>
                  {k.total !== undefined && (
                    <Badge variant="outline" className="border-primary/20 text-primary shadow-[0_0_15px_oklch(var(--primary)/0.1)]">
                      {k.total} TOTAL
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50 mb-1.5">{k.label}</p>
                  <p className="font-display text-3xl font-bold tracking-tight text-foreground">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

       <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CVA Alerts */}
        <Card className="glass-card border-white/5 overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle className="h-20 w-20" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-white/[0.03]">
            <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary/70">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas Críticos (CVA)
            </CardTitle>
            <Badge variant="destructive" className="font-mono">
              {cvaAlerts.length} PENDENTE
            </Badge>
          </CardHeader>
          <CardContent className="pt-6">
            {cvaAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500/50" />
                </div>
                <p className="text-sm font-bold text-foreground/80 uppercase tracking-widest">Frota Segura</p>
                <p className="mt-1 text-xs text-muted-foreground/60 font-medium">Todos os certificados estão em dia.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cvaAlerts.slice(0, 5).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.05] hover:translate-x-1 group/item">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-transparent font-mono text-sm font-black text-primary border border-white/5 group-hover/item:border-primary/30 transition-colors">
                      {a.prefix.split('-')[1] || a.prefix}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm tracking-tight text-foreground uppercase">{a.prefix}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{a.model || "Aeronave"}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={a.daysLeft <= 15 ? "destructive" : "outline"} className="font-mono text-[11px]">
                        {a.daysLeft < 0 ? `VENCIDO` : `${a.daysLeft} DIAS`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5 overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Wrench className="h-20 w-20" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-white/[0.03]">
            <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary/70">
              <Wrench className="h-4 w-4 text-primary" /> Manutenção Preditiva
            </CardTitle>
            <Badge variant="outline" className="border-primary/20 text-primary font-mono">
              {upcomingMx.length} ITENS
            </Badge>
          </CardHeader>
          <CardContent>
            {upcomingMx.length === 0 ? (
              <p className="py-10 text-center text-xs font-medium text-muted-foreground bg-white/[0.02] rounded-xl border border-dashed border-white/5">
                Nenhuma manutenção pendente.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingMx.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{m.description || m.item_type}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-tighter">
                        {m.aircraft_prefix || m.aircraft?.prefix || "—"}
                      </p>
                    </div>
                    <Badge variant={m.daysLeft <= 15 ? "destructive" : "outline"} className="text-[10px] font-bold font-mono py-0 px-2 shrink-0">
                      {m.daysLeft < 0 ? `VENCIDO` : `${m.daysLeft}d`}
                    </Badge>
                  </div>
                ))}
              </div>
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

      <Card className="mt-8 glass-card border-white/5">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
            <TrendingUp className="h-4 w-4 text-primary" /> Atividade de Manutenção Recente
          </CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 hover:bg-primary/5">
            <Link to="/services">Relatório Completo</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentServices.length === 0 ? (
            <div className="py-12 text-center text-xs font-medium text-muted-foreground bg-white/[0.02] rounded-xl border border-dashed border-white/5">
              Nenhum serviço registrado recentemente.
            </div>
          ) : (
            <div className="relative space-y-0 before:absolute before:inset-y-0 before:left-[19px] before:w-[2px] before:bg-white/5">
              {recentServices.map((s: any, idx: number) => (
                <div key={s.id} className="relative flex items-center gap-6 py-4 transition-all hover:bg-white/[0.02] rounded-xl px-2">
                  <div className={cn(
                    "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-sidebar bg-card text-primary shadow-lg",
                    s.status === "completed" ? "text-emerald-500 border-emerald-500/20" : "text-primary border-primary/20"
                  )}>
                    {s.status === "completed" ? <CheckCircle2 className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-foreground truncate">{s.service_type}</p>
                      <Badge variant={s.status === "completed" ? "default" : "outline"} className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-1.5 py-0 h-4 shrink-0",
                        s.status === "completed" ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20" : "bg-primary/10 text-primary"
                      )}>
                        {s.status === "completed" ? "Concluído" : "Em Aberto"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                      <span className="font-mono bg-white/5 px-1.5 rounded text-[10px] text-primary/80 uppercase tracking-tighter">
                        {s.aircraft?.prefix || s.aircraft_prefix || "—"}
                      </span>
                      {s.performed_at && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-white/10" />
                          <span>{format(parseISO(s.performed_at), "PPP", { locale: ptBR })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Footer */}
      <div className="mt-12 mb-8">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 mb-4 px-1">Atalhos do Sistema</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <QuickLink to="/aircraft" icon={Plane} label="Gestão de Frota" />
          <QuickLink to="/flight-logs" icon={History} label="Diário Digital" />
          <QuickLink to="/services" icon={Wrench} label="Engenharia" />
          <QuickLink to="/parts" icon={Cog} label="Almoxarifado" />
          <QuickLink to="/library" icon={BookMarked} label="Documentação" />
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to as any} className="group flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 hover:border-primary/40 hover:bg-white/[0.05] hover:-translate-y-1">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">{label}</span>
    </Link>
  );
}