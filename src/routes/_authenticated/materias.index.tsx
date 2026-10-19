import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SubjectDialog } from "@/components/subject-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { subjectProgress } from "@/lib/progress";
import { subjectsQuery, useCreateSubject } from "@/lib/study-data";
import { subjectColor } from "@/lib/subject-colors";
import { cn } from "@/lib/utils";
import checklistImg from "@/assets/checklist.png";

export const Route = createFileRoute("/_authenticated/materias/")({
  head: () => ({
    meta: [
      { title: "Matérias — Study" },
      { name: "description", content: "Todas as suas matérias e o progresso de cada uma." },
      { property: "og:title", content: "Matérias — Study" },
      { property: "og:description", content: "Todas as suas matérias e o progresso de cada uma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(subjectsQuery()),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { data: subjects } = useSuspenseQuery(subjectsQuery());
  const create = useCreateSubject();

  const newButton = (
    <SubjectDialog
      title="Nova matéria"
      submitLabel="Criar matéria"
      pending={create.isPending}
      onSubmit={(v) => create.mutateAsync(v)}
      trigger={
        <Button>
          <Plus /> Nova matéria
        </Button>
      }
    />
  );

  return (
    <main className="flex-1 space-y-7 p-5 sm:p-8">
      <PageHeader title="Matérias">{newButton}</PageHeader>

      {subjects.length === 0 ? (
        <section className="card-surface flex flex-col items-center gap-4 px-6 py-14 text-center">
          <img src={checklistImg} alt="" width={1024} height={1024} loading="lazy" className="h-40 w-auto" />
          <h2 className="text-lg font-bold">Nenhuma matéria ainda</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Crie sua primeira matéria para começar a acompanhar seu progresso.
          </p>
        </section>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-3">
          {subjects.map((s) => {
            const p = subjectProgress(s.topics);
            const c = subjectColor(s.color);
            const done = s.topics.filter((t) => t.done).length;
            return (
              <Link
                key={s.id}
                to="/materias/$subjectId"
                params={{ subjectId: s.id }}
                className="card-surface group block p-7 transition hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <span className={cn("size-3 rounded-full", c.dot)} />
                  <h2 className="truncate text-lg font-bold group-hover:text-primary">{s.name}</h2>
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <p className="text-sm text-muted-foreground">
                    {done} de {s.topics.length} {s.topics.length === 1 ? "conteúdo" : "conteúdos"}
                  </p>
                  <p className={cn("text-2xl font-extrabold", c.text)}>{p}%</p>
                </div>
                <Progress value={p} className="mt-3" indicatorClassName={c.bar} />
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
