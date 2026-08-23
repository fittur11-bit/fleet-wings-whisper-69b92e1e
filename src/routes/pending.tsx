import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, Wrench, Package, Clock, CheckCircle2, ShieldAlert, Plane } from "lucide-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { AuthGuard } from "@/components/AuthGuard";
import { useAircraft, useServices, useMaintenanceItems, useShipments } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { differenceInDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/pending")({
  component: () => <AuthGuard><PendingPage /></AuthGuard>,
});

function PendingPage() {
  const { data: aircraft = [] } = useAircraft();
  const { data: services = [] } = useServices();
  const { data: mx = [] } = useMaintenanceItems();
  const { data: shipments = [] } = useShipments();

  const today = new Date();

  const data = useMemo(() => {
    const cvaList = aircraft
      .filter((a: any) => a.cva_expiration)
      .map((a: any) => ({ ...a, daysLeft: differenceInDays(parseISO(a.cva_expiration), today) }))
      .filter((a: any) => a.daysLeft <= 60)
      .sort((a: any, b: any) => a.daysLeft - b.daysLeft);

    const mxList = mx
      .filter((m: any) => m.due_date)
      .map((m: any) => ({ ...m, daysLeft: differenceInDays(parseISO(m.due_date), today) }))
      .filter((m: any) => m.daysLeft <= 60)
      .sort((a: any, b: any) => a.daysLeft - b.daysLeft);

    const lateShipments = shipments
      .filter((s: any) => s.status !== "received" && s.status !== "cancelled" && s.estimated_return_date)
      .map((s: any) => ({ ...s, daysLate: differenceInDays(today, parseISO(s.estimated_return_date)) }))
      .filter((s: any) => s.daysLate > 0)
      .sort((a: any, b: any) => b.daysLate - a.daysLate);

    const pendingSvc = services
      .filter((s: any) => s.status === "pending" || s.status === "in_progress")
      .sort((a: any, b: any) => (a.performed_at || "").localeCompare(b.performed_at || ""));

    return { cvaList, mxList, lateShipments, pendingSvc };
  }, [aircraft, mx, shipments, services]);

  const totalCount =
    data.cvaList.length + data.mxList.length + data.lateShipments.length + data.pendingSvc.length;

  return (
    <AppShell>
      <PageHeader
        title="O que preciso fazer"
        description={`${totalCount} pendência${totalCount === 1 ? "" : "s"} requer${totalCount === 1 ? "" : "em"} atenção`}
      />

      {totalCount === 0 && (
        <div className="technical-card  p-16 text-center border-dashed border-white/10">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
          <h3 className="mt-4 font-sans text-lg font-semibold">Tudo em dia!</h3>
          <p className="mt-1 text-sm text-muted-foreground">Nenhuma pendência crítica no momento.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* CVAs */}
        {data.cvaList.length > 0 && (
          <Card className="border-white/5 bg-card/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4 text-amber-400" /> CVAs próximas
              </CardTitle>
              <Badge variant="outline">{data.cvaList.length}</Badge>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.cvaList.map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-background/40 px-3 py-2">
                    <div>
                      <p className="font-mono text-sm font-semibold">{a.prefix}</p>
                      <p className="text-xs text-muted-foreground">{a.model || "—"}</p>
                    </div>
                    <Badge variant={a.daysLeft < 0 ? "destructive" : a.daysLeft <= 15 ? "destructive" : "outline"} className="text-[10px]">
                      {a.daysLeft < 0 ? `${Math.abs(a.daysLeft)}d vencida` : `${a.daysLeft}d restantes`}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Manutenções */}
        {data.mxList.length > 0 && (
          <Card className="border-white/5 bg-card/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4 text-primary" /> Manutenções a vencer
              </CardTitle>
              <Badge variant="outline">{data.mxList.length}</Badge>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 max-h-[420px] overflow-y-auto">
                {data.mxList.map((m: any) => (
                  <li key={m.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-background/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.description || m.item_type}</p>
                      <p className="text-xs text-muted-foreground font-mono">{m.aircraft_prefix || m.aircraft?.prefix || "—"}</p>
                    </div>
                    <Badge variant={m.daysLeft < 0 ? "destructive" : m.daysLeft <= 15 ? "destructive" : "outline"} className="text-[10px] shrink-0 ml-2">
                      {m.daysLeft < 0 ? `${Math.abs(m.daysLeft)}d vencido` : `${m.daysLeft}d`}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Envios atrasados */}
        {data.lateShipments.length > 0 && (
          <Card className="border-red-500/20 bg-card/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-red-400" /> Peças com retorno atrasado
              </CardTitle>
              <Badge variant="destructive">{data.lateShipments.length}</Badge>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {data.lateShipments.map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.part_name}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{s.aircraft?.prefix}</span>
                        {s.destination_workshop && ` · ${s.destination_workshop}`}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-[10px] shrink-0 ml-2">
                      {s.daysLate}d atrasado
                    </Badge>
                  </li>
                ))}
              </ul>
              <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
                <Link to="/shipments">Ver todos os envios</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Serviços pendentes */}
        {data.pendingSvc.length > 0 && (
          <Card className="border-white/5 bg-card/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-sky-400" /> Serviços abertos
              </CardTitle>
              <Badge variant="outline">{data.pendingSvc.length}</Badge>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 max-h-[420px] overflow-y-auto">
                {data.pendingSvc.map((s: any) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-background/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.service_type}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{s.aircraft?.prefix || s.aircraft_prefix}</span>
                        {s.performed_at && ` · ${format(parseISO(s.performed_at), "dd/MM/yyyy", { locale: ptBR })}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 ml-2 capitalize">{s.status}</Badge>
                  </li>
                ))}
              </ul>
              <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
                <Link to="/services">Ver todos os serviços</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
