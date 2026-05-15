import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Plane, Wrench, Cog, AlertTriangle, CheckCircle2, Clock, TrendingUp, BookMarked, History } from "lucide-react";
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
  const monthlyFlights = logs.filter((l: any) => {
    const d = parseISO(l.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;

  const kpis = [
    { label: "Frota Ativa", value: activeAircraft, total: aircraft.length, icon: Plane, to: "/aircraft" },
    { label: "Horas Totais", value: `${totalFlightHours.toFixed(1)}h`, icon: Clock, to: "/aircraft" },
    { label: "Voos no Mês", value: monthlyFlights, icon: History, to: "/flight-logs" },
    { label: "Manutenção", value: inMaintenance, icon: Wrench, to: "/aircraft" },
  ];

  return (
    <>
      <PageHeader
        title="Painel"
        description="Visão geral da operação e alertas de conformidade."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} to={k.to} className="group">
            <Card className="border-white/5 bg-card/60 backdrop-blur transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
                    <p className="mt-2 font-display text-3xl font-bold tracking-tight">{k.value}</p>
                    {k.total !== undefined && (
                      <p className="mt-1 text-xs text-muted-foreground">de {k.total} no total</p>
                    )}
                  </div>
                     <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <k.icon className="h-5 w-5" />
                  </div>
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