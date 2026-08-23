import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SECURITY_QUESTIONS } from "@/lib/constants";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — FlightCore" },
      { name: "description", content: "Acesse o FlightCore para gerenciar sua frota aeronáutica, manutenção e conformidade CVA." },
      { property: "og:title", content: "Entrar — FlightCore" },
      { property: "og:description", content: "Acesse o FlightCore para gerenciar sua frota aeronáutica, manutenção e conformidade CVA." },
      { name: "robots", content: "noindex,nofollow" },
    ],
    links: [{ rel: "canonical", href: "https://coreflight.studioonze11.com.br/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup
  const [fullName, setFullName] = useState("");
  const [secQuestion, setSecQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [secAnswer, setSecAnswer] = useState("");

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Bem-vindo de volta!");
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secAnswer.trim()) {
      toast.error("Informe a resposta da pergunta de segurança");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    // Auto-confirm está ligado: já podemos logar e salvar a pergunta
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signErr) {
      setLoading(false);
      toast.error(signErr.message);
      return;
    }
    const { error: rpcErr } = await supabase.rpc("set_security_question", {
      _question: secQuestion,
      _answer: secAnswer,
    });
    setLoading(false);
    if (rpcErr) {
      toast.error("Conta criada, mas falhou ao salvar pergunta: " + rpcErr.message);
    } else {
      toast.success("Conta criada com sucesso!");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center  bg-gradient-to-br from-primary to-[oklch(0.86_0.11_86)] shadow-[0_0_40px_-10px] shadow-primary/60">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Entrar no FlightCore</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesso ao centro de comando</p>
        </div>

        <div className="technical-card  p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <form onSubmit={signIn} className="space-y-4">
                <div>
                  <Label htmlFor="si-email">E-mail</Label>
                  <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="si-pw">Senha</Label>
                  <Input id="si-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-[oklch(0.86_0.11_86)] text-primary-foreground">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <form onSubmit={signUp} className="space-y-4">
                <div>
                  <Label htmlFor="su-name">Nome completo</Label>
                  <Input id="su-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="su-email">E-mail</Label>
                  <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="su-pw">Senha</Label>
                  <Input id="su-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div>
                  <Label>Pergunta de segurança</Label>
                  <Select value={secQuestion} onValueChange={setSecQuestion}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECURITY_QUESTIONS.map((q) => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="su-ans">Resposta</Label>
                  <Input id="su-ans" required value={secAnswer} onChange={(e) => setSecAnswer(e.target.value)} placeholder="Use algo que você sempre lembre" />
                  <p className="mt-1 text-xs text-muted-foreground">Será usada para recuperar sua senha. Não diferencia maiúsculas/acentos.</p>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-[oklch(0.86_0.11_86)] text-primary-foreground">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
