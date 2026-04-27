import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, User as UserIcon, Bot } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useAircraft, useServices, useMaintenanceItems } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistant")({
  component: () => <AuthGuard><AssistantPage /></AuthGuard>,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Quais aeronaves da minha frota têm CVA vencendo nos próximos 30 dias?",
  "Explique a diferença entre CVA e IAM para aeronaves experimentais.",
  "Quais ADs típicas se aplicam a um Lycoming O-360?",
  "Resuma as inspeções obrigatórias da revisão de 100h.",
];

function AssistantPage() {
  const { data: aircraft = [] } = useAircraft();
  const { data: services = [] } = useServices();
  const { data: mx = [] } = useMaintenanceItems();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setLoading(true);

    const context = {
      fleet_summary: aircraft.map((a: any) => ({
        prefix: a.prefix, model: a.model, status: a.status,
        cva_expiration: a.cva_expiration, total_hours: a.total_hours,
      })),
      open_services: services.filter((s: any) => s.status !== "completed").length,
      maintenance_due: mx.filter((m: any) => m.status !== "ok").length,
    };

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { messages: next, context },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([...next, { role: "assistant", content: data.reply || "" }]);
    } catch (e: any) {
      toast.error(e.message || "Falha ao consultar o assistente");
      setMessages([...next, { role: "assistant", content: "⚠️ Não consegui responder agora. Tente novamente em instantes." }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <PageHeader
        title="Assistente IA"
        description="Tire dúvidas sobre regulamentação ANAC, manutenção e a sua frota."
      />

      <div className="grid h-[calc(100vh-13rem)] grid-rows-[1fr_auto] gap-4">
        {/* Messages */}
        <Card className="overflow-hidden border-white/5 bg-card/40 backdrop-blur">
          <CardContent className="h-full overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold">Como posso ajudar?</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Pergunte sobre suas aeronaves, manutenções, ADs/SBs ou regulamentação.
                </p>
                <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-xl border border-white/5 bg-background/40 p-3 text-left text-sm text-foreground/80 transition hover:border-primary/40 hover:bg-background/70"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-3",
                      m.role === "user" && "flex-row-reverse"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      m.role === "user" ? "bg-primary/20 text-primary" : "bg-gradient-to-br from-primary/30 to-primary/5 text-primary"
                    )}>
                      {m.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-primary/15 text-foreground"
                        : "bg-background/60 text-foreground/90 border border-white/5"
                    )}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-background/60 px-4 py-2.5">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Input */}
        <div className="flex items-end gap-2 rounded-2xl border border-white/5 bg-card/60 p-2 backdrop-blur">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Pergunte algo… (Enter envia, Shift+Enter quebra linha)"
            rows={1}
            className="min-h-[40px] resize-none border-0 bg-transparent focus-visible:ring-0"
          />
          <Button onClick={() => send()} disabled={!input.trim() || loading} size="icon" className="shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}
