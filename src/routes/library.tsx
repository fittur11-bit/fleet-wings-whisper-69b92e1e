import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookMarked, Plus, Search, FileText, ExternalLink, Trash2 } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useDocuments, useAircraft } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DOC_TYPES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/library")({
  component: () => <AuthGuard><LibraryPage /></AuthGuard>,
});

function LibraryPage() {
  const { data: docs = [] } = useDocuments();
  const { data: aircraft = [] } = useAircraft();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<any>({
    title: "", doc_type: "AMM", model: "", aircraft_id: "",
    version: "", revision_date: "", file_url: "", notes: "",
  });

  const filtered = docs.filter((d: any) => {
    const matchType = typeFilter === "all" || d.doc_type === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      d.title?.toLowerCase().includes(q) ||
      d.model?.toLowerCase().includes(q) ||
      d.version?.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("documents").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("documents").getPublicUrl(path);
      setForm((f: any) => ({ ...f, file_url: data.publicUrl, title: f.title || file.name }));
      toast.success("Arquivo enviado");
    } catch (e: any) {
      toast.error("Falha no upload: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title || !form.doc_type) {
      toast.error("Título e tipo são obrigatórios");
      return;
    }
    if (!user) {
      toast.error("Faça login para salvar documentos");
      return;
    }
    const payload = {
      ...form,
      user_id: user.id,
      aircraft_id: form.aircraft_id || null,
      revision_date: form.revision_date || null,
    };
    const { error } = await supabase.from("documents").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Documento adicionado");
    setOpen(false);
    setForm({ title: "", doc_type: "AMM", model: "", aircraft_id: "", version: "", revision_date: "", file_url: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este documento?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  // Group counts by type
  const counts = DOC_TYPES.reduce((acc: any, t) => {
    acc[t.value] = docs.filter((d: any) => d.doc_type === t.value).length;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Biblioteca Técnica"
        description="Manuais, ADs, SBs e documentos de aeronavegabilidade."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Novo documento</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar documento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Título *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo *</Label>
                    <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Versão</Label>
                    <Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Modelo</Label>
                    <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Ex.: PA-34" />
                  </div>
                  <div>
                    <Label>Data de revisão</Label>
                    <Input type="date" value={form.revision_date} onChange={(e) => setForm({ ...form, revision_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Aeronave (opcional)</Label>
                  <Select value={form.aircraft_id || "none"} onValueChange={(v) => setForm({ ...form, aircraft_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geral</SelectItem>
                      {aircraft.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.prefix}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Arquivo</Label>
                  <input
                    type="file"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:text-primary hover:file:bg-primary/20"
                  />
                  {uploading && <p className="mt-1 text-xs text-muted-foreground">Enviando…</p>}
                  {form.file_url && <p className="mt-1 truncate text-xs text-emerald-400">✓ Arquivo enviado</p>}
                </div>
                <div>
                  <Label>Notas</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={save}>Salvar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Summary cards by type */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {DOC_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setTypeFilter(typeFilter === t.value ? "all" : t.value)}
            className={`rounded-lg border p-3 text-left transition ${typeFilter === t.value ? "border-primary/60 bg-primary/10" : "border-white/5 bg-card/40 hover:border-white/20"}`}
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t.label}</p>
            <p className="mt-1 font-display text-xl font-bold">{counts[t.value] || 0}</p>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, modelo, versão…"
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-white/10 bg-card/30">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <BookMarked className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {docs.length === 0 ? "Sua biblioteca está vazia. Adicione o primeiro documento." : "Nenhum documento encontrado."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d: any) => (
            <Card key={d.id} className="group border-white/5 bg-card/60 backdrop-blur transition hover:border-primary/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium">{d.title}</p>
                      <Badge variant="outline" className="shrink-0 text-[10px]">{d.doc_type}</Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {d.model || "Geral"} {d.version && `· v${d.version}`}
                    </p>
                    {d.revision_date && (
                      <p className="text-xs text-muted-foreground">
                        Rev. {format(parseISO(d.revision_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      {d.file_url && (
                        <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                          <a href={d.file_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-1 h-3 w-3" /> Abrir
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(d.id)} className="h-7 text-xs text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
