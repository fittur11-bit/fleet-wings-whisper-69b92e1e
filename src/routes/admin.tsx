import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, BarChart3, Archive, LogOut, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Administrador - FlightCore" }],
  }),
});

const PIN_KEY = "flightcore_admin_pin_hash";
const UNLOCK_KEY = "flightcore_admin_unlocked";

async function sha256(text: string) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function AdminPage() {
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHasPin(!!localStorage.getItem(PIN_KEY));
    setUnlocked(sessionStorage.getItem(UNLOCK_KEY) === "1");
  }, []);

  const setupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return toast.error("A senha deve ter no mínimo 4 caracteres");
    if (pin !== confirmPin) return toast.error("Senhas não coincidem");
    setLoading(true);
    const hash = await sha256(pin);
    localStorage.setItem(PIN_KEY, hash);
    sessionStorage.setItem(UNLOCK_KEY, "1");
    setHasPin(true);
    setUnlocked(true);
    setPin("");
    setConfirmPin("");
    setLoading(false);
    toast.success("Senha de administrador definida");
  };

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const hash = await sha256(pin);
    const stored = localStorage.getItem(PIN_KEY);
    setLoading(false);
    if (hash !== stored) {
      setPin("");
      return toast.error("Senha incorreta");
    }
    sessionStorage.setItem(UNLOCK_KEY, "1");
    setUnlocked(true);
    setPin("");
  };

  const lock = () => {
    sessionStorage.removeItem(UNLOCK_KEY);
    setUnlocked(false);
  };

  const resetPin = () => {
    if (!confirm("Remover a senha de administrador atual? Você precisará definir uma nova."))
      return;
    localStorage.removeItem(PIN_KEY);
    sessionStorage.removeItem(UNLOCK_KEY);
    setHasPin(false);
    setUnlocked(false);
  };

  if (!hasPin) {
    return (
      <Gate icon={<ShieldCheck className="h-8 w-8 text-primary" />} title="Definir senha de administrador" subtitle="Crie uma senha para proteger o acesso aos módulos administrativos.">
        <form onSubmit={setupPin} className="space-y-4">
          <div className="space-y-2">
            <Label>Nova senha</Label>
            <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Confirmar senha</Label>
            <Input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>Definir senha</Button>
        </form>
      </Gate>
    );
  }

  if (!unlocked) {
    return (
      <Gate icon={<Lock className="h-8 w-8 text-primary" />} title="Acesso restrito" subtitle="Digite a senha de administrador para continuar.">
        <form onSubmit={unlock} className="space-y-4">
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>Desbloquear</Button>
          <button type="button" onClick={resetPin} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
            Esqueci a senha (redefinir)
          </button>
        </form>
      </Gate>
    );
  }

  const modules = [
    { to: "/usage", label: "Custos e Uso", desc: "Métricas de uso, IA e custos estimados", icon: BarChart3 },
    { to: "/backup", label: "Backup & Limpeza", desc: "Exportar, restaurar e limpar dados", icon: Archive },
    { to: "/modules", label: "Visibilidade de Módulos", desc: "Escolher quais módulos aparecem para todos", icon: SlidersHorizontal },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2"><ShieldCheck className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Painel Administrador</h1>
            <p className="text-muted-foreground text-sm mt-1">Acesso restrito aos módulos sensíveis do sistema.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetPin}>Trocar senha</Button>
          <Button variant="secondary" size="sm" onClick={lock}>
            <LogOut className="mr-2 h-4 w-4" /> Bloquear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.to} to={m.to}>
              <Card className="p-5 hover:border-primary/50 transition-colors cursor-pointer h-full">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{m.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Gate({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="rounded-2xl bg-primary/10 p-4">{icon}</div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </Card>
    </div>
  );
}