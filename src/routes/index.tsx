import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, CheckCircle2, Library } from "lucide-react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import welcomeImg from "@/assets/welcome.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Study — Organize suas matérias e veja seu progresso" },
      {
        name: "description",
        content: "Um painel de estudos pessoal: cadastre matérias, marque conteúdos estudados e acompanhe seu progresso.",
      },
      { property: "og:title", content: "Study — Organize suas matérias e veja seu progresso" },
      {
        property: "og:description",
        content: "Um painel de estudos pessoal: cadastre matérias, marque conteúdos estudados e acompanhe seu progresso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Library, title: "Matérias organizadas", text: "Separe tudo por matéria, com cores próprias." },
  { icon: CheckCircle2, title: "Conteúdos marcados", text: "Liste os assuntos e marque o que já estudou." },
  { icon: BarChart3, title: "Progresso visível", text: "Veja a porcentagem e a atividade da semana." },
];

function Index() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const cta = signedIn ? (
    <Button asChild variant="hero" size="lg">
      <Link to="/dashboard">
        Ir para o painel <ArrowRight />
      </Link>
    </Button>
  ) : (
    <Button asChild variant="hero" size="lg">
      <Link to="/auth">
        Começar agora <ArrowRight />
      </Link>
    </Button>
  );

  return (
    <div className="min-h-screen bg-canvas p-0 sm:p-8 lg:p-12">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col overflow-hidden bg-shell shadow-shell sm:min-h-[calc(100vh-4rem)] sm:rounded-4xl lg:min-h-[calc(100vh-6rem)]">
        <header className="flex items-center justify-between px-6 py-6 sm:px-10">
          <Brand to="/" />
          <Button asChild variant="soft">
            <Link to={signedIn ? "/dashboard" : "/auth"}>{signedIn ? "Painel" : "Entrar"}</Link>
          </Button>
        </header>

        <main className="flex flex-1 flex-col justify-center px-6 pb-12 sm:px-10">
          <section className="grid items-center gap-10 rounded-3xl bg-welcome px-8 py-12 sm:px-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Seu painel de estudos</p>
              <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] text-welcome-foreground sm:text-5xl">
                Saiba exatamente quanto você já estudou.
              </h1>
              <p className="mt-5 max-w-md text-lg text-foreground/70">
                Cadastre suas matérias, divida em conteúdos e acompanhe seu progresso em um painel simples.
              </p>
              <div className="mt-8">{cta}</div>
            </div>
            <img src={welcomeImg} alt="Estudante lendo um caderno" width={1024} height={1024} className="mx-auto h-72 w-auto lg:h-96" />
          </section>

          <section className="mt-8 grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border bg-card p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <f.icon className="size-5" />
                </span>
                <h2 className="mt-4 font-bold">{f.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
