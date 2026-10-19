import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BookMarked, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SubjectDialog } from "@/components/subject-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { overallProgress, subjectProgress, weeklyActivity } from "@/lib/progress";
import { displayNameOf, profileQuery, subjectsQuery, useCreateSubject, type Subject } from "@/lib/study-data";
import { subjectColor } from "@/lib/subject-colors";
import { cn } from "@/lib/utils";
import welcomeImg from "@/assets/welcome.png";
import achievementsImg from "@/assets/achievements.png";
import checklistImg from "@/assets/checklist.png";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel — Study" },
      { name: "description", content: "Veja seu progresso em cada matéria e sua atividade da semana." },
      { property: "og:title", content: "Painel — Study" },
      { property: "og:description", content: "Veja seu progresso em cada matéria e sua atividade da semana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(subjectsQuery()),
      context.queryClient.ensureQueryData(profileQuery(context.user.id)),
    ]),
  component: Dashboard,
});

function fmtDate(iso: string) {
  return format(new Date(iso), "d MMM yyyy", { locale: ptBR });
}

function lastActivity(s: Subject) {
  const dates = [s.updated_at, ...s.topics.map((t) => t.completed_at ?? t.created_at)];
  return dates.sort().at(-1) ?? s.created_at;
}

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: subjects } = useSuspenseQuery(subjectsQuery());
  const { data: profile } = useSuspenseQuery(profileQuery(user.id));
  const [search, setSearch] = useState("");
  const createSubject = useCreateSubject();

  const name = displayNameOf(profile, user.email);
  const firstName = name.split(" ")[0];
  const allTopics = useMemo(() => subjects.flatMap((s) => s.topics.map((t) => ({ ...t, subject: s }))), [subjects]);
  const overall = overallProgress(subjects);
  const doneCount = allTopics.filter((t) => t.done).length;
  const week = useMemo(() => weeklyActivity(allTopics), [allTopics]);
  const pending = allTopics.filter((t) => !t.done).slice(0, 4);
  const completedSubjects = subjects.filter((s) => s.topics.length > 0 && subjectProgress(s.topics) === 100).length;
  const filtered = subjects.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex flex-1 flex-col xl:flex-row">
      <main className="min-w-0 flex-1 space-y-7 p-5 sm:p-8">
        <PageHeader title="Painel">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar matéria"
              className="h-11 rounded-lg bg-card pl-9"
            />
          </div>
        </PageHeader>

        {/* Welcome */}
        <section className="relative overflow-hidden rounded-2xl bg-welcome px-7 py-7 sm:px-8">
          <div className="relative z-10 max-w-md">
            <h2 className="text-lg font-bold text-welcome-foreground">Bem-vindo(a) de volta, {firstName}!</h2>
            {subjects.length > 0 ? (
              <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
                Você concluiu <strong className="text-welcome-foreground">{overall}%</strong> dos seus conteúdos.
                <br />
                Escolha o próximo assunto e melhore seu resultado.
              </p>
            ) : (
              <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
                Comece cadastrando suas matérias e os conteúdos que você precisa estudar.
              </p>
            )}
          </div>
          <img
            src={welcomeImg}
            alt=""
            width={1024}
            height={1024}
            className="pointer-events-none absolute -bottom-6 right-6 hidden h-44 w-auto sm:block"
          />
        </section>

        {subjects.length === 0 ? (
          <EmptyState pending={createSubject.isPending} onCreate={(v) => createSubject.mutateAsync(v)} />
        ) : (
          <>
            <div className="grid gap-7 lg:grid-cols-2">
              {/* Results */}
              <section className="card-surface p-7">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="font-bold">Resultados</h3>
                  <Button asChild variant="soft" size="sm">
                    <Link to="/materias">Ver todas</Link>
                  </Button>
                </div>
                <ul className="space-y-5">
                  {filtered.slice(0, 6).map((s) => {
                    const p = subjectProgress(s.topics);
                    const c = subjectColor(s.color);
                    return (
                      <li key={s.id}>
                        <Link
                          to="/materias/$subjectId"
                          params={{ subjectId: s.id }}
                          className="group flex items-center gap-3"
                        >
                          <span className={cn("size-2.5 shrink-0 rounded-full", c.dot)} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold group-hover:text-primary">{s.name}</p>
                            <p className="text-sm text-muted-foreground">{fmtDate(lastActivity(s))}</p>
                          </div>
                          <div className="h-0.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div className={cn("h-full rounded-full", c.bar)} style={{ width: `${p}%` }} />
                          </div>
                          <span className={cn("w-11 text-right text-sm font-bold", c.text)}>{p}%</span>
                        </Link>
                      </li>
                    );
                  })}
                  {filtered.length === 0 && (
                    <li className="py-6 text-center text-sm text-muted-foreground">Nenhuma matéria encontrada.</li>
                  )}
                </ul>
              </section>

              <div className="space-y-7">
                {/* Weekly chart */}
                <section className="card-surface p-7">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-bold">Atividade da semana</h3>
                    <div className="flex gap-4 text-xs font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-coral" />Adicionados</span>
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky" />Concluídos</span>
                    </div>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={week} barGap={6} margin={{ left: -24, right: 4, top: 4 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                        <Tooltip
                          cursor={{ fill: "var(--muted)" }}
                          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontFamily: "Mulish" }}
                        />
                        <Bar dataKey="adicionados" name="Adicionados" fill="var(--coral)" barSize={4} radius={[4, 4, 4, 4]} />
                        <Bar dataKey="concluidos" name="Concluídos" fill="var(--sky)" barSize={4} radius={[4, 4, 4, 4]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* Summary */}
                <section className="card-surface p-7">
                  <h3 className="mb-5 font-bold">Resumo</h3>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <Stat value={subjects.length} label="Matérias" className="bg-primary-soft text-primary" />
                    <Stat value={allTopics.length} label="Conteúdos" className="bg-coral-soft text-coral" />
                    <Stat value={doneCount} label="Concluídos" className="bg-sky-soft text-sky" />
                  </div>
                </section>
              </div>
            </div>

            {/* Table */}
            <section className="card-surface overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="border-b text-[15px]">
                    <th className="px-7 py-5 font-bold">Matéria</th>
                    <th className="px-4 py-5 font-bold">Conteúdos</th>
                    <th className="px-4 py-5 font-bold">Concluídos</th>
                    <th className="px-7 py-5 font-bold">Progresso</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => {
                    const c = subjectColor(s.color);
                    const done = s.topics.filter((t) => t.done).length;
                    return (
                      <tr key={s.id} className="text-[15px] transition-colors hover:bg-muted/60">
                        <td className="px-7 py-3.5">
                          <Link to="/materias/$subjectId" params={{ subjectId: s.id }} className="flex items-center gap-3 font-semibold">
                            <span className={cn("grid size-8 place-items-center rounded-lg", c.soft)}>
                              <BookMarked className={cn("size-4", c.text)} />
                            </span>
                            {s.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5">{s.topics.length}</td>
                        <td className="px-4 py-3.5">{done}</td>
                        <td className="px-7 py-3.5 font-semibold">{subjectProgress(s.topics)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>

      {/* Right panel */}
      <aside className="w-full shrink-0 space-y-8 bg-shell p-7 xl:w-80">
        <div className="flex flex-col items-center text-center">
          <div className="grid size-20 place-items-center rounded-full bg-sky text-3xl font-extrabold text-primary-foreground">
            {name.charAt(0).toUpperCase()}
          </div>
          <p className="mt-3 text-lg font-bold">{name}</p>
          <p className="text-sm text-muted-foreground">Estudante</p>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-bold">Próximos conteúdos</h3>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada pendente por aqui. 🎉</p>
          ) : (
            <ul className="space-y-4">
              {pending.map((t) => (
                <li key={t.id}>
                  <Link
                    to="/materias/$subjectId"
                    params={{ subjectId: t.subject.id }}
                    className="flex items-center gap-4 rounded-xl transition-colors hover:bg-muted/60"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-coral-soft">
                      <BookMarked className="size-4 text-coral" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.title}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {t.subject.name} · {fmtDate(t.created_at)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-balance p-7 text-primary-foreground shadow-float">
          <p className="text-xs font-bold uppercase tracking-[0.15em] opacity-80">Conteúdos concluídos</p>
          <p className="mt-2 text-4xl font-extrabold">
            {doneCount}
            <span className="text-lg font-semibold opacity-70"> / {allTopics.length}</span>
          </p>
        </div>

        <div className="card-surface p-6">
          <h3 className="font-bold">Conquistas</h3>
          <img src={achievementsImg} alt="" width={1024} height={768} loading="lazy" className="mx-auto mt-2 w-full max-w-60" />
          <p className="text-center text-sm text-muted-foreground">
            {completedSubjects === 0
              ? "Conclua 100% de uma matéria para ganhar sua primeira conquista."
              : `${completedSubjects} ${completedSubjects === 1 ? "matéria concluída" : "matérias concluídas"}!`}
          </p>
        </div>
      </aside>
    </div>
  );
}

function Stat({ value, label, className }: { value: number; label: string; className: string }) {
  return (
    <div className={cn("rounded-xl px-2 py-4", className)}>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyState({
  pending,
  onCreate,
}: {
  pending: boolean;
  onCreate: (v: { name: string; color: string }) => Promise<unknown>;
}) {
  return (
    <section className="card-surface flex flex-col items-center gap-4 px-6 py-12 text-center">
      <img src={checklistImg} alt="" width={1024} height={1024} loading="lazy" className="h-40 w-auto" />
      <h3 className="text-lg font-bold">Adicione sua primeira matéria</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Depois, liste os conteúdos de cada uma e marque o que já estudou para ver seu progresso.
      </p>
      <SubjectDialog
        title="Nova matéria"
        submitLabel="Criar matéria"
        pending={pending}
        onSubmit={onCreate}
        trigger={
          <Button variant="hero" size="lg">
            <Plus /> Nova matéria
          </Button>
        }
      />
    </section>
  );
}
