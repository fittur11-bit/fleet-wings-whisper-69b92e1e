import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FlightCore — Gestão de Frotas Aeronáuticas" },
      { name: "description", content: "Plataforma profissional para gestão de frotas aeronáuticas: aeronaves, manutenção, conformidade CVA e biblioteca técnica." },
      { property: "og:title", content: "FlightCore — Gestão de Frotas Aeronáuticas" },
      { property: "og:description", content: "Plataforma profissional para gestão de frotas aeronáuticas: aeronaves, manutenção, conformidade CVA e biblioteca técnica." },
    ],
    links: [{ rel: "canonical", href: "https://coreflight.studioonze11.com.br/" }],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    navigate({ to: user ? "/dashboard" : "/auth" });
  }, [loading, navigate, user]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
