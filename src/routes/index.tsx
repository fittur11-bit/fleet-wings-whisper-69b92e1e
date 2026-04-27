import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Plane, ShieldCheck, Sparkles, Wrench, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-5 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.74_0.142_78)] to-[oklch(0.86_0.11_86)]">
            <ShieldCheck className="h-5 w-5 text-[oklch(0.16_0.04_255)]" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">FleetControl</span>
        </div>
        <Link to="/auth">
          <Button variant="outline" size="sm">Entrar</Button>
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 lg:pt-28">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border gold-border bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Aviation Intelligence Platform
          </span>
          <h1 className="mt-8 font-display text-5xl font-bold tracking-tight sm:text-7xl">
            Comando total da sua <br />
            <span className="gold-text">frota aeronáutica</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Gestão completa de aeronaves, manutenção, conformidade CVA, peças e biblioteca técnica — com inteligência artificial especializada em aviação.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-to-r from-primary to-[oklch(0.86_0.11_86)] text-primary-foreground shadow-[0_0_40px_-10px] shadow-primary/60">
                Começar agora <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Plane, title: "Frota Inteligente", desc: "CVA, inspeções e horas em tempo real." },
            { icon: Wrench, title: "Manutenção Total", desc: "Checklists, fotos e relatórios PDF." },
            { icon: Sparkles, title: "Assistente IA", desc: "Especialista em aviação 24/7." },
          ].map((f) => (
            <div key={f.title} className="glass-card glass-card-hover rounded-2xl p-6">
              <f.icon className="h-8 w-8 text-primary" />
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
