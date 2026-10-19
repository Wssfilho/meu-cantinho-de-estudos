import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { cn } from "@/lib/utils";
import welcomeImg from "@/assets/welcome.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Study" },
      { name: "description", content: "Entre ou crie sua conta para acompanhar seus estudos." },
      { property: "og:title", content: "Entrar — Study" },
      { property: "og:description", content: "Entre ou crie sua conta para acompanhar seus estudos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard", data: { display_name: name.trim() } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/dashboard", replace: true });
        else setNotice("Quase lá! Enviamos um link de confirmação para o seu e-mail.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice("Se houver uma conta com este e-mail, você receberá um link para redefinir a senha.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Invalid login")) toast.error("E-mail ou senha incorretos");
      else if (msg.toLowerCase().includes("weak") || msg.toLowerCase().includes("pwned"))
        toast.error("Senha muito fraca", { description: "Essa senha é conhecida e fácil de adivinhar. Escolha outra." });
      else if (msg.includes("Email not confirmed"))
        toast.error("Confirme seu e-mail", { description: "Clique no link que enviamos para o seu e-mail." });
      else if (msg.includes("already registered")) toast.error("Este e-mail já tem uma conta", { description: "Tente entrar." });
      else toast.error("Não foi possível continuar", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  async function oauth(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) {
      toast.error("Não foi possível entrar", { description: result.error.message });
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  const titles: Record<Mode, string> = {
    signin: "Entrar na sua conta",
    signup: "Criar sua conta",
    forgot: "Redefinir senha",
  };

  return (
    <div className="min-h-dvh bg-shell">
      <div className="mx-auto grid min-h-dvh w-full overflow-hidden bg-shell lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-welcome p-10 lg:flex">
          <Brand to="/" />
          <div>
            <h2 className="text-3xl font-extrabold leading-tight text-welcome-foreground">
              Estude com clareza.
              <br />
              Veja seu progresso crescer.
            </h2>
            <p className="mt-3 max-w-xs text-foreground/70">
              Organize suas matérias, marque o que já estudou e acompanhe cada avanço.
            </p>
          </div>
          <img src={welcomeImg} alt="" width={1024} height={1024} className="mx-auto h-64 w-auto" />
        </div>

        <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
          <div className="mb-10 lg:hidden">
            <Brand to="/" />
          </div>
          <h1 className="text-2xl font-extrabold">{titles[mode]}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "Informe seu e-mail e enviaremos um link."
              : "Seus dados ficam salvos e disponíveis em qualquer aparelho."}
          </p>

          {mode !== "forgot" && (
            <>
              <div className="mt-8 grid gap-3">
                <Button type="button" variant="outline" className="h-11 font-semibold" onClick={() => oauth("google")}>
                  <GoogleIcon /> Continuar com Google
                </Button>
                <button type="button" className="lovable-auth-button" onClick={() => oauth("lovable")}>
                  Continue with Lovable
                </button>
              </div>
              <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className={cn("space-y-4", mode === "forgot" && "mt-8")}>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Seu nome</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  {mode === "signin" && (
                    <button type="button" onClick={() => setMode("forgot")} className="text-xs font-semibold text-primary hover:underline">
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
            )}
            {notice && <p className="rounded-lg bg-sky-soft p-3 text-sm font-semibold text-primary">{notice}</p>}
            <Button type="submit" variant="hero" className="h-11 w-full" disabled={loading}>
              {mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Ainda não tem conta?{" "}
                <button onClick={() => { setMode("signup"); setNotice(null); }} className="font-bold text-primary hover:underline">
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button onClick={() => { setMode("signin"); setNotice(null); }} className="font-bold text-primary hover:underline">
                  Entrar
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
