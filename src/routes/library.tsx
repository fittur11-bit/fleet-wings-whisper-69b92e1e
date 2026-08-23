import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
 import { BookMarked, Plus, Search, FileText, ExternalLink, Trash2, Calendar, Plane, History, Pencil, Eye, X, Download, Maximize2, Minimize2 } from "lucide-react";
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
import { resolveStorageUrl } from "@/lib/storage-urls";
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
   const [editing, setEditing] = useState<any | null>(null);
   const [previewDoc, setPreviewDoc] = useState<any | null>(null);
   const [fullscreen, setFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
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
      if (!user) throw new Error("Sessão expirada");
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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
     
     let error;
     if (editing) {
       const { id, ...rest } = payload;
       const res = await supabase.from("documents").update(rest).eq("id", editing.id);
       error = res.error;
     } else {
       const res = await supabase.from("documents").insert(payload);
       error = res.error;
     }

     if (error) return toast.error(error.message);
     toast.success(editing ? "Documento atualizado" : "Documento adicionado");
     closeDialog();
     qc.invalidateQueries({ queryKey: ["documents"] });
   };

   const closeDialog = () => {
     setOpen(false);
     setEditing(null);
     setForm({ title: "", doc_type: "AMM", model: "", aircraft_id: "", version: "", revision_date: "", file_url: "", notes: "" });
   };

   const openEdit = (d: any) => {
     setEditing(d);
     setForm({
       title: d.title || "",
       doc_type: d.doc_type || "AMM",
       model: d.model || "",
       aircraft_id: d.aircraft_id || "",
       version: d.version || "",
       revision_date: d.revision_date || "",
       file_url: d.file_url || "",
       notes: d.notes || "",
     });
     setOpen(true);
   };

  const remove = async (id: string) => {
    if (!confirm("Remover este documento?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const getFileExt = (url: string) => {
    try {
      const clean = url.split("?")[0].split("#")[0];
      return (clean.split(".").pop() || "").toLowerCase();
    } catch {
      return "";
    }
  };

  const isImage = (url: string) => ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(getFileExt(url));
  const isPdf = (url: string) => getFileExt(url) === "pdf";

  const downloadFile = async (doc: any) => {
    if (!doc?.file_url) return;
    try {
      const url = await resolveStorageUrl(doc.file_url);
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = getFileExt(doc.file_url) || "bin";
      const safeTitle = (doc.title || "documento").replace(/[^\w\-. ]+/g, "_");
      const filename = safeTitle.toLowerCase().endsWith("." + ext) ? safeTitle : `${safeTitle}.${ext}`;
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      toast.success("Download iniciado");
    } catch (e: any) {
      toast.error("Falha no download: " + e.message);
    }
  };

  const openExternal = async (url?: string) => {
    if (!url) return;
    const resolved = await resolveStorageUrl(url);
    window.open(resolved, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    let cancelled = false;
    if (!previewDoc?.file_url) {
      setPreviewUrl("");
      return;
    }
    resolveStorageUrl(previewDoc.file_url).then((u) => {
      if (!cancelled) setPreviewUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [previewDoc]);

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
           <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDialog())}>
             <DialogTrigger asChild>
               <Button className="bg-primary text-primary-foreground shadow-lg"><Plus className="mr-2 h-4 w-4" /> Novo documento</Button>
             </DialogTrigger>
             <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg bg-sidebar/95  border-white/10">
               <DialogHeader>
                 <DialogTitle className="font-sans text-xl">{editing ? "Editar documento" : "Novo documento"}</DialogTitle>
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
            <p className="mt-1 font-sans text-xl font-bold">{counts[t.value] || 0}</p>
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
         <div className="technical-card  p-16 text-center border-dashed border-white/10">
           <BookMarked className="mx-auto h-14 w-14 text-muted-foreground/40" />
           <h3 className="mt-4 font-sans text-lg font-semibold">
             {docs.length === 0 ? "Biblioteca vazia" : "Nenhum documento encontrado"}
           </h3>
           <p className="mt-1 text-sm text-muted-foreground">
             {docs.length === 0 ? "Adicione o primeiro manual ou documento técnico." : "Tente ajustar os filtros ou a busca."}
           </p>
         </div>
       ) : (
         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
           {filtered.map((d: any) => (
             <div key={d.id} className="technical-card p-5 border border-white/5 flex flex-col">
               <div className="flex items-start justify-between mb-4">
                 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                   <FileText className="h-5 w-5" />
                 </div>
                 <div className="flex items-center gap-1">
                   <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-primary" onClick={() => openEdit(d)}>
                     <Pencil className="h-4 w-4" />
                   </Button>
                   <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => remove(d.id)}>
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
               </div>

               <div className="flex-1">
                 <div className="flex items-center gap-2 mb-1">
                   <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-white/5 border-white/10">
                     {d.doc_type}
                   </Badge>
                   {d.version && (
                     <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5 h-4">
                       v{d.version}
                     </Badge>
                   )}
                 </div>
                 <h3 className="font-sans font-semibold text-lg line-clamp-1 leading-tight">{d.title}</h3>
                 <p className="text-xs text-muted-foreground mt-1 mb-4">
                   {d.model || "Uso Geral"}
                 </p>

                 <div className="space-y-2 mb-4">
                   {d.aircraft?.prefix && (
                     <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                       <Plane className="h-3 w-3 text-primary" />
                       <span className="font-mono font-bold text-foreground/80">{d.aircraft.prefix}</span>
                     </div>
                   )}
                   {d.revision_date && (
                     <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                       <History className="h-3 w-3" />
                       <span>Rev: {format(parseISO(d.revision_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                     </div>
                   )}
                 </div>
               </div>

                {d.file_url ? (
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setPreviewDoc(d)} 
                      className="flex-1 h-9 rounded-md shadow-lg shadow-primary/10" 
                      variant="secondary"
                    >
                      <Eye className="mr-2 h-3.5 w-3.5" /> Visualizar
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-md shrink-0"
                      onClick={() => downloadFile(d)}
                      title="Baixar arquivo"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-9 w-9 rounded-md shrink-0"
                      title="Abrir em nova aba"
                      onClick={() => openExternal(d.file_url)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                 <Button disabled variant="outline" className="w-full h-9 rounded-md border-dashed">
                   Sem Arquivo
                 </Button>
               )}
             </div>
           ))}
         </div>
       )}

      <Dialog open={!!previewDoc} onOpenChange={(v) => { if (!v) { setPreviewDoc(null); setFullscreen(false); } }}>
        <DialogContent
          className={
            fullscreen
              ? "max-w-none w-screen h-screen p-0 flex flex-col bg-background border-0 rounded-none overflow-hidden"
              : "max-w-5xl w-[100vw] sm:w-auto h-[100dvh] sm:h-[90vh] p-0 flex flex-col bg-background border-white/10 overflow-hidden rounded-none sm:rounded-md"
          }
        >
          <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-sidebar/50 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-sans font-semibold text-foreground leading-none truncate">{previewDoc?.title}</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                  {previewDoc?.doc_type} {previewDoc?.version && `· v${previewDoc.version}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadFile(previewDoc)} title="Baixar">
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Abrir em nova aba"
                onClick={() => openExternal(previewDoc?.file_url)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="hidden sm:inline-flex h-8 w-8" onClick={() => setFullscreen((f) => !f)} title={fullscreen ? "Sair de tela cheia" : "Tela cheia"}>
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => { setPreviewDoc(null); setFullscreen(false); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 w-full bg-neutral-900 relative overflow-auto">
            {previewDoc?.file_url && previewUrl ? (
              isImage(previewDoc.file_url) ? (
                <div className="flex h-full w-full items-center justify-center p-2">
                  <img
                    src={previewUrl}
                    alt={previewDoc.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : isPdf(previewDoc.file_url) ? (
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                  className="w-full h-full border-none bg-white"
                  title={previewDoc.title}
                />
              ) : (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-none bg-white"
                  title={previewDoc.title}
                />
              )
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Nenhum arquivo disponível
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
