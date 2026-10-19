import { useState } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react";

import { SubjectDialog } from "@/components/subject-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { subjectProgress } from "@/lib/progress";
import {
  subjectQuery,
  useAddTopic,
  useDeleteSubject,
  useDeleteTopic,
  useToggleTopic,
  useUpdateSubject,
} from "@/lib/study-data";
import { subjectColor } from "@/lib/subject-colors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/materias/$subjectId")({
  head: () => ({
    meta: [
      { title: "Matéria — Study" },
      { name: "description", content: "Conteúdos e progresso desta matéria." },
      { property: "og:title", content: "Matéria — Study" },
      { property: "og:description", content: "Conteúdos e progresso desta matéria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context, params }) => {
    const subject = await context.queryClient.ensureQueryData(subjectQuery(params.subjectId));
    if (!subject) throw notFound();
  },
  notFoundComponent: () => (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <h1 className="text-xl font-bold">Matéria não encontrada</h1>
      <Button asChild variant="soft">
        <Link to="/materias">Voltar para matérias</Link>
      </Button>
    </main>
  ),
  component: SubjectPage,
});

function SubjectPage() {
  const { subjectId } = Route.useParams();
  const navigate = useNavigate();
  const { data: subject } = useSuspenseQuery(subjectQuery(subjectId));
  const [title, setTitle] = useState("");

  const update = useUpdateSubject();
  const remove = useDeleteSubject();
  const addTopic = useAddTopic();
  const toggle = useToggleTopic();
  const deleteTopic = useDeleteTopic();

  if (!subject) return null;
  const c = subjectColor(subject.color);
  const p = subjectProgress(subject.topics);
  const done = subject.topics.filter((t) => t.done).length;

  return (
    <main className="flex-1 space-y-7 p-5 sm:p-8">
      <Link to="/materias" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Matérias
      </Link>

      <section className="card-surface p-7 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={cn("size-4 rounded-full", c.dot)} />
            <h1 className="text-2xl font-extrabold">{subject.name}</h1>
          </div>
          <div className="flex gap-2">
            <SubjectDialog
              title="Editar matéria"
              submitLabel="Salvar"
              initial={{ name: subject.name, color: subject.color }}
              pending={update.isPending}
              onSubmit={(v) => update.mutateAsync({ id: subject.id, ...v })}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil /> Editar
                </Button>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir “{subject.name}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    A matéria e todos os seus conteúdos serão apagados. Isso não pode ser desfeito.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      await remove.mutateAsync(subject.id);
                      navigate({ to: "/materias", replace: true });
                    }}
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between">
          <p className="text-sm text-muted-foreground">
            {done} de {subject.topics.length} conteúdos concluídos
          </p>
          <p className={cn("text-3xl font-extrabold", c.text)}>{p}%</p>
        </div>
        <Progress value={p} className="mt-3 h-2.5" indicatorClassName={c.bar} />
      </section>

      <section className="card-surface p-7 sm:p-8">
        <h2 className="mb-5 font-bold">Conteúdos</h2>
        <form
          className="flex gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            await addTopic.mutateAsync({ subjectId: subject.id, title });
            setTitle("");
          }}
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Ex: Equações do 2º grau"
            className="h-11 rounded-lg"
          />
          <Button type="submit" className="h-11" disabled={!title.trim() || addTopic.isPending}>
            <Plus /> Adicionar
          </Button>
        </form>

        {subject.topics.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Adicione os conteúdos que você precisa estudar nesta matéria.
          </p>
        ) : (
          <ul className="mt-6 divide-y">
            {subject.topics.map((t) => (
              <li key={t.id} className="group flex items-center gap-4 py-3.5">
                <Checkbox
                  id={`t-${t.id}`}
                  checked={t.done}
                  onCheckedChange={(v) => toggle.mutate({ id: t.id, done: v === true })}
                  className="size-5"
                />
                <label
                  htmlFor={`t-${t.id}`}
                  className={cn(
                    "flex-1 cursor-pointer text-[15px] font-semibold",
                    t.done && "text-muted-foreground line-through",
                  )}
                >
                  {t.title}
                </label>
                <button
                  onClick={() => deleteTopic.mutate(t.id)}
                  aria-label={`Remover ${t.title}`}
                  className="rounded-md p-1.5 text-muted-foreground opacity-60 transition hover:bg-muted hover:text-destructive group-hover:opacity-100"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
