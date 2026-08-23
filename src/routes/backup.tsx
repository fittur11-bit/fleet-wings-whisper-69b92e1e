import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Archive, Download, Trash2, Loader2, AlertTriangle, HardDrive } from "lucide-react";
import JSZip from "jszip";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fmtBytes } from "@/lib/usage-tracking";

export const Route = createFileRoute("/backup")({
  component: () => <AuthGuard><BackupPage /></AuthGuard>,
});

const BUCKETS = [
  { name: "aircraft-photos", label: "Fotos de Aeronaves" },
  { name: "service-photos", label: "Fotos de Serviços" },
  { name: "part-photos", label: "Fotos de Peças/Reparo" },
  { name: "documents", label: "Documentos / RAB" },
] as const;

type FileEntry = { bucket: string; path: string; size: number };

async function listAllFiles(bucket: string): Promise<FileEntry[]> {
  const out: FileEntry[] = [];
  // Recursive walk (supabase storage list is per-folder)
  const walk = async (prefix: string) => {
    let offset = 0;
    const limit = 100;
    while (true) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const item of data) {
        // Folder entries have no metadata
        if (item.id === null || !item.metadata) {
          await walk(prefix ? `${prefix}/${item.name}` : item.name);
        } else {
          out.push({
            bucket,
            path: prefix ? `${prefix}/${item.name}` : item.name,
            size: Number(item.metadata?.size || 0),
          });
        }
      }
      if (data.length < limit) break;
      offset += limit;
    }
  };
  await walk("");
  return out;
}

function BackupPage() {
  const [scanning, setScanning] = useState(false);
  const [files, setFiles] = useState<FileEntry[] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [exported, setExported] = useState(false);

  const totalBytes = files?.reduce((s, f) => s + f.size, 0) || 0;
  const byBucket = BUCKETS.map((b) => {
    const list = files?.filter((f) => f.bucket === b.name) || [];
    return { ...b, count: list.length, bytes: list.reduce((s, f) => s + f.size, 0) };
  });

  const scan = async () => {
    setScanning(true);
    setExported(false);
    try {
      const all: FileEntry[] = [];
      for (const b of BUCKETS) {
        setProgressLabel(`Listando ${b.label}…`);
        try {
          const list = await listAllFiles(b.name);
          all.push(...list);
        } catch (e: any) {
          console.warn(`bucket ${b.name}:`, e.message);
        }
      }
      setFiles(all);
      toast.success(`${all.length} arquivos encontrados (${fmtBytes(all.reduce((s, f) => s + f.size, 0))})`);
    } catch (e: any) {
      toast.error("Falha ao listar: " + e.message);
    } finally {
      setScanning(false);
      setProgressLabel("");
    }
  };

  const exportZip = async () => {
    if (!files?.length) return;
    setExporting(true);
    setProgress(0);
    try {
      const zip = new JSZip();
      let done = 0;
      for (const f of files) {
        setProgressLabel(`Baixando ${f.path}`);
        const { data, error } = await supabase.storage.from(f.bucket).download(f.path);
        if (error) {
          console.warn("download falhou:", f.path, error.message);
        } else if (data) {
          zip.file(`${f.bucket}/${f.path}`, data);
        }
        done++;
        setProgress(Math.round((done / files.length) * 100));
      }
      // Manifesto
      const manifest = {
        exported_at: new Date().toISOString(),
        total_files: files.length,
        total_bytes: totalBytes,
        files: files.map((f) => ({ bucket: f.bucket, path: f.path, size: f.size })),
      };
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));

      setProgressLabel("Compactando ZIP…");
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      a.download = `fleetcontrol-midias-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExported(true);
      toast.success("ZIP exportado com sucesso");
    } catch (e: any) {
      toast.error("Falha ao exportar: " + e.message);
    } finally {
      setExporting(false);
      setProgressLabel("");
      setProgress(0);
    }
  };

  const wipe = async () => {
    if (!files?.length) return;
    setDeleting(true);
    setProgress(0);
    try {
      let done = 0;
      // Group by bucket for batch delete
      for (const b of BUCKETS) {
        const paths = files.filter((f) => f.bucket === b.name).map((f) => f.path);
        if (!paths.length) continue;
        // Delete in chunks of 100
        for (let i = 0; i < paths.length; i += 100) {
          const chunk = paths.slice(i, i + 100);
          setProgressLabel(`Excluindo ${b.label} (${done + chunk.length}/${files.length})`);
          const { error } = await supabase.storage.from(b.name).remove(chunk);
          if (error) console.warn(`remove ${b.name}:`, error.message);
          done += chunk.length;
          setProgress(Math.round((done / files.length) * 100));
        }
      }
      toast.success(`${done} arquivos excluídos do storage`);
      setFiles([]);
      setExported(false);
    } catch (e: any) {
      toast.error("Falha ao excluir: " + e.message);
    } finally {
      setDeleting(false);
      setProgressLabel("");
      setProgress(0);
    }
  };

  const busy = scanning || exporting || deleting;

  return (
    <AppShell>
      <PageHeader
        title="Backup & Limpeza"
        description="Exporte todas as mídias em um ZIP e libere espaço no armazenamento da nuvem."
      />

      <Card className="border-white/5 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4 text-primary" /> Inventário do storage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!files && (
            <p className="text-sm text-muted-foreground">
              Faça uma varredura para listar todas as mídias armazenadas na nuvem.
            </p>
          )}

          {files && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {byBucket.map((b) => (
                <div key={b.name} className="rounded-lg border border-white/5 bg-background/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{b.label}</p>
                  <p className="mt-1 font-sans text-xl font-bold">{b.count}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtBytes(b.bytes)}</p>
                </div>
              ))}
            </div>
          )}

          {files && (
            <div className="flex items-center justify-between rounded-lg bg-primary/5 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="font-sans text-2xl font-bold">{files.length} arquivos</p>
              </div>
              <Badge variant="outline" className="text-sm">{fmtBytes(totalBytes)}</Badge>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={scan} disabled={busy} variant="outline">
              {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HardDrive className="mr-2 h-4 w-4" />}
              {files ? "Re-escanear" : "Escanear storage"}
            </Button>

            <Button onClick={exportZip} disabled={busy || !files?.length}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Exportar ZIP
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={busy || !files?.length || !exported}>
                  <Trash2 className="mr-2 h-4 w-4" /> Limpar storage
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Excluir todas as mídias?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">
                      Isso vai apagar <strong>{files?.length} arquivos</strong> ({fmtBytes(totalBytes)}) do storage da nuvem, em todos os buckets.
                    </span>
                    <span className="block text-destructive">
                      ⚠️ As referências (URLs) permanecem nos cadastros, mas as imagens não vão mais carregar. Faça o backup ZIP antes.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={wipe} className="bg-destructive hover:bg-destructive/90">
                    Sim, excluir tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {!exported && files && files.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              💡 O botão de limpeza só fica disponível depois de exportar o ZIP — para evitar perda acidental.
            </p>
          )}

          {(exporting || deleting) && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="truncate text-xs text-muted-foreground">{progressLabel} — {progress}%</p>
            </div>
          )}
          {scanning && progressLabel && (
            <p className="text-xs text-muted-foreground">{progressLabel}</p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 border-white/5 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Archive className="h-4 w-4" /> Como funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. <strong>Escanear</strong> — lista todos os arquivos dos buckets de mídia.</p>
          <p>2. <strong>Exportar ZIP</strong> — baixa tudo para o seu computador, organizado por pasta de bucket, com um <code className="text-xs">manifest.json</code> incluindo caminhos e tamanhos.</p>
          <p>3. <strong>Limpar storage</strong> — apaga os arquivos da nuvem (somente após exportar). Libera espaço imediatamente.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
