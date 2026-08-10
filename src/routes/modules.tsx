import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, EyeOff, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { MODULES, ADMIN_EMAILS, setModuleVisibility, useModuleVisibility } from "@/lib/modules";
import { useAuth } from "@/lib/auth";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/modules")({
  component: ModulesPage,
  head: () => ({
    meta: [
      { title: "Visibilidade de Módulos - FlightCore" },
      { name: "description", content: "Escolha quais módulos ficam visíveis no menu para todos os usuários do FlightCore." },
      { property: "og:title", content: "Visibilidade de Módulos - FlightCore" },
      { property: "og:description", content: "Controle central de quais módulos aparecem no menu para todos os usuários." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ModulesPage() {
  const { data: visibility = {}, isLoading } = useModuleVisibility();
  const qc = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const { user } = useAuth();
  const isOwner = ADMIN_EMAILS.includes((user?.email ?? "").toLowerCase());

  const toggle = async (key: string, next: boolean) => {
    setSaving(key);
    try {
      await setModuleVisibility(key, next);
      await qc.invalidateQueries({ queryKey: ["module-visibility"] });
      toast.success(next ? "Módulo visível para todos" : "Módulo ocultado para todos");
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Voltar ao painel administrador">
          <Link to="/admin"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="rounded-xl bg-primary/10 p-2"><SlidersHorizontal className="h-6 w-6 text-primary" /></div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Visibilidade de Módulos</h1>
          <p className="text-muted-foreground text-sm mt-1">Escolha quais módulos aparecem no menu para todos os usuários.</p>
        </div>
      </div>

      {!isOwner && (
        <Card className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 text-primary" />
          Apenas o administrador principal pode alterar estas configurações.
        </Card>
      )}

      <Card className="divide-y divide-border/40">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const visible = visibility[m.key] ?? true;
          const locked = "locked" in m && m.locked;
          return (
            <div key={m.key} className="flex items-center gap-4 p-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{m.label}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {locked ? "Sempre visível" : visible ? <><Eye className="h-3 w-3" /> Visível para todos</> : <><EyeOff className="h-3 w-3" /> Oculto para todos</>}
                </p>
              </div>
              <Switch
                checked={locked ? true : visible}
                disabled={!!locked || !isOwner || isLoading || saving === m.key}
                onCheckedChange={(v) => toggle(m.key, v)}
                aria-label={`Alternar visibilidade de ${m.label}`}
              />
            </div>
          );
        })}
      </Card>
    </div>
  );
}
