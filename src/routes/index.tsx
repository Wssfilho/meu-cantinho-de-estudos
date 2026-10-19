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
    <div className="h-dvh overflow-hidden bg-shell">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden bg-shell">
        <header className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-10 sm:py-5">
          <Brand to="/" />
          <Button asChild variant="soft">
            <Link to={signedIn ? "/dashboard" : "/auth"}>{signedIn ? "Painel" : "Entrar"}</Link>
          </Button>
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-5 sm:gap-6 sm:px-10 sm:pb-8">
          <section className="flex min-h-0 flex-1 flex-col gap-4 rounded-3xl bg-welcome px-6 py-6 sm:px-12 sm:py-8 lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-10">
            <div className="shrink-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary sm:text-sm">
                Seu painel de estudos
              </p>
              <h1 className="mt-3 text-3xl font-extrabold leading-[1.1] text-welcome-foreground sm:mt-4 sm:text-4xl lg:text-5xl">
                Saiba exatamente quanto você já estudou.
              </h1>
              <p className="mt-3 max-w-md text-base text-foreground/70 sm:mt-5 sm:text-lg">
                Cadastre suas matérias, divida em conteúdos e acompanhe seu progresso em um painel
                simples.
              </p>
              <div className="mt-5 sm:mt-8">{cta}</div>
            </div>
            {/* A ilustração ocupa só o espaço restante, encolhendo em telas baixas. */}
            <div className="relative min-h-0 flex-1 lg:h-full">
              <img
                src={welcomeImg}
                alt="Estudante lendo um caderno"
                width={1024}
                height={1024}
                className="absolute inset-0 size-full object-contain"
              />
            </div>
          </section>

          <section className="grid shrink-0 grid-cols-3 gap-3 sm:gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border bg-card p-3 sm:p-5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary sm:size-11">
                  <f.icon className="size-4 sm:size-5" />
                </span>
                <h2 className="mt-2 text-xs font-bold leading-tight sm:mt-3 sm:text-base">
                  {f.title}
                </h2>
                <p className="mt-1 hidden text-sm text-muted-foreground sm:block">{f.text}</p>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
