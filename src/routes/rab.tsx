import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ExternalLink, Plane, Globe, Sparkles, Upload, Loader2, FileText, Wand2 } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAircraft } from "@/lib/queries";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AircraftForm } from "@/components/AircraftForm";

export const Route = createFileRoute("/rab")({
  component: () => <AuthGuard><RabPage /></AuthGuard>,
});

type Extracted = {
  prefix?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serial_number?: string | null;
  year?: number | null;
  owner?: string | null;
  cva_expiration?: string | null;
  notes?: string | null;
};

function RabPage() {
  const [prefix, setPrefix] = useState("");
  const { data: aircraft = [] } = useAircraft();
  const [importUrl, setImportUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<any>(null);

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

  const callExtract = async (payload: { url?: string; fileUrl?: string; fileType?: string }) => {
    setLoading(true);
    setExtracted(null);
    try {
      const { data, error } = await supabase.functions.invoke("rab-extract", { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setExtracted(data?.data || {});
      toast.success("Dados extraídos com sucesso");
    } catch (e: any) {
      toast.error("Falha na extração: " + (e?.message || "erro"));
    } finally {
      setLoading(false);
    }
  };

  const extractFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = importUrl.trim();
    if (!u) return;
    await callExtract({ url: u });
  };

  const extractFromFile = async (file: File) => {
    setLoading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `rab-import/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("documents").getPublicUrl(path);
      await callExtract({ fileUrl: pub.publicUrl, fileType: file.type });
    } catch (e: any) {
      toast.error("Falha no upload: " + (e?.message || "erro"));
      setLoading(false);
    }
  };

  // Remove chaves com valor vazio/null/undefined para não sobrescrever dados existentes
  const cleanExtracted = (e: Extracted): Partial<Extracted> => {
    const out: Record<string, any> = {};
    Object.entries(e).forEach(([k, v]) => {
      if (v === null || v === undefined) return;
      if (typeof v === "string" && v.trim() === "") return;
      out[k] = typeof v === "string" ? v.trim() : v;
    });
    return out;
  };

  const normalizePrefix = (p?: string | null) =>
    (p || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  const fillNew = () => {
    if (!extracted) return;
    const clean = cleanExtracted(extracted);
    if (!clean.prefix) {
      return toast.error("Prefixo não identificado. Necessário para cadastrar.");
    }
    // Bloqueia duplicidade: se já existe aeronave com este prefixo, redireciona para atualizar
    const dup = aircraft.find(
      (a: any) => normalizePrefix(a.prefix) === normalizePrefix(clean.prefix as string),
    );
    if (dup) {
      toast.info("Prefixo já cadastrado — abrindo atualização.");
      setFormInitial({ ...dup, ...clean });
      setFormOpen(true);
      return;
    }
    setFormInitial(clean);
    setFormOpen(true);
  };

  const fillExisting = () => {
    const clean = cleanExtracted(extracted || {});
    if (!clean.prefix) return toast.error("Sem prefixo extraído — obrigatório para identificar a aeronave");
    const target = aircraft.find(
      (a: any) => normalizePrefix(a.prefix) === normalizePrefix(clean.prefix as string),
    );
    if (!target) return toast.error(`Nenhuma aeronave cadastrada com o prefixo ${clean.prefix}`);
    // Mescla: dados extraídos vazios NÃO sobrescrevem; notas são concatenadas
    const { notes: extractedNotes, prefix: _p, ...rest } = clean;
    const merged: any = { ...target, ...rest, prefix: target.prefix };
    if (extractedNotes) {
      merged.notes = [target.notes, extractedNotes].filter(Boolean).join("\n");
    }
    setFormInitial(merged);
    setFormOpen(true);
    toast.success(`Mesclado com ${target.prefix}`);
  };

  return (
    <>
      <PageHeader
        title="Consulta RAB"
        description="Consulte o RAB no portal ANAC ou importe dados manualmente para preencher a frota."
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

      <Card className="mt-6 border-white/5 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Importação manual + extração por IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="url">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">Por URL</TabsTrigger>
              <TabsTrigger value="file">Upload (PDF/Imagem)</TabsTrigger>
            </TabsList>
            <TabsContent value="url" className="mt-4">
              <form onSubmit={extractFromUrl} className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="https://sistemas.anac.gov.br/aeronaves/..."
                  className="flex-1"
                />
                <Button type="submit" disabled={loading || !importUrl.trim()}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Extrair
                </Button>
              </form>
              <p className="mt-2 text-xs text-muted-foreground">Cole a URL da consulta RAB para que a IA leia e extraia os dados.</p>
            </TabsContent>
            <TabsContent value="file" className="mt-4">
              <Label className="block">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => e.target.files?.[0] && extractFromFile(e.target.files[0])}
                />
                <div className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 px-4 py-8 text-center hover:border-primary/40 hover:bg-card/40">
                  {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <p className="mt-2 text-sm font-medium">Selecione um PDF ou imagem do RAB</p>
                  <p className="text-xs text-muted-foreground">A IA fará OCR e extrairá os dados automaticamente</p>
                </div>
              </Label>
            </TabsContent>
          </Tabs>

          {extracted && (
            <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Dados extraídos</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Field label="Prefixo" value={extracted.prefix} mono />
                <Field label="Fabricante" value={extracted.manufacturer} />
                <Field label="Modelo" value={extracted.model} />
                <Field label="N° Série" value={extracted.serial_number} />
                <Field label="Ano" value={extracted.year?.toString()} />
                <Field label="Vencimento CVA" value={extracted.cva_expiration} />
                <Field label="Proprietário" value={extracted.owner} className="col-span-2 sm:col-span-3" />
                {extracted.notes && <Field label="Observações" value={extracted.notes} className="col-span-2 sm:col-span-3" />}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button onClick={fillNew} className="flex-1">
                  <Plane className="mr-2 h-4 w-4" /> Preencher nova aeronave
                </Button>
                <Button onClick={fillExisting} variant="outline" className="flex-1">
                  <Wand2 className="mr-2 h-4 w-4" /> Atualizar existente
                </Button>
              </div>
            </div>
          )}
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{formInitial?.id ? "Atualizar aeronave" : "Cadastrar aeronave"}</DialogTitle>
          </DialogHeader>
          {formInitial && (
            <AircraftForm initial={formInitial} onDone={() => setFormOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, value, mono, className }: { label: string; value?: string | null; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 ${mono ? "font-mono" : ""} ${value ? "" : "text-muted-foreground/50"}`}>
        {value || "—"}
      </p>
    </div>
  );
}
