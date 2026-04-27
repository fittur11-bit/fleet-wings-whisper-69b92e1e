import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ExternalLink, Plane, Globe } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAircraft } from "@/lib/queries";

export const Route = createFileRoute("/rab")({
  component: () => <AuthGuard><RabPage /></AuthGuard>,
});

function RabPage() {
  const [prefix, setPrefix] = useState("");
  const { data: aircraft = [] } = useAircraft();

  const cleaned = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const anacUrl = cleaned
    ? `https://sistemas.anac.gov.br/aeronaves/cons_rab.asp?textMarca=${encodeURIComponent(cleaned)}`
    : "https://sistemas.anac.gov.br/aeronaves/cons_rab.asp";

  const matches = cleaned
    ? aircraft.filter((a: any) => a.prefix?.toUpperCase().includes(cleaned))
    : aircraft;

  const open = (e?: React.FormEvent) => {
    e?.preventDefault();
    window.open(anacUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <PageHeader
        title="Consulta RAB"
        description="Consulte o Registro Aeronáutico Brasileiro diretamente no portal ANAC."
      />

      <Card className="border-white/5 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" /> Buscar prefixo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={open} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="Ex.: PT-XYZ"
                className="pl-9 font-mono uppercase"
              />
            </div>
            <Button type="submit" disabled={!cleaned}>
              <ExternalLink className="mr-2 h-4 w-4" /> Consultar no ANAC
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            A consulta abre o portal oficial sistemas.anac.gov.br em uma nova aba.
          </p>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {cleaned ? `Da sua frota (${matches.length})` : `Frota cadastrada (${aircraft.length})`}
        </h2>

        {matches.length === 0 ? (
          <Card className="border-dashed border-white/10 bg-card/30">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Plane className="h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                {aircraft.length === 0 ? "Nenhuma aeronave cadastrada." : "Nenhuma aeronave da sua frota com este prefixo."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((a: any) => {
              const url = `https://sistemas.anac.gov.br/aeronaves/cons_rab.asp?textMarca=${encodeURIComponent(a.prefix.replace("-", ""))}`;
              return (
                <Card key={a.id} className="border-white/5 bg-card/60 backdrop-blur">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-lg font-bold tracking-wider">{a.prefix}</p>
                        <p className="text-xs text-muted-foreground">{a.model || "—"}</p>
                        {a.serial_number && (
                          <p className="mt-1 text-xs text-muted-foreground">S/N: {a.serial_number}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px]">{a.status}</Badge>
                    </div>
                    <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                      <a href={url} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-3 w-3" /> Consultar RAB
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
