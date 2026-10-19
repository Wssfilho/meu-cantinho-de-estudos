import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  Clock3,
  Coffee,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { usePomodoro } from "@/hooks/use-pomodoro";
import { POMODORO_PHASES, type PomodoroPhase } from "@/lib/pomodoro";
import { formatStudyDuration, studyTimeSummary } from "@/lib/progress";
import { studySessionsQuery } from "@/lib/study-data";
import { cn } from "@/lib/utils";

function clock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

const PHASES: PomodoroPhase[] = ["focus", "shortBreak", "longBreak"];
const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function PomodoroPanel({ userId }: { userId: string }) {
  const timer = usePomodoro(userId);
  const sessions = useQuery(studySessionsQuery(userId));
  const summary = studyTimeSummary(sessions.data ?? []);
  const [visibleSessions, setVisibleSessions] = useState(6);
  const completed = useRef(timer.completedFocusCount);
  useEffect(() => {
    if (timer.completedFocusCount > completed.current) {
      toast.success("Foco concluído!", {
        description: "Seu ciclo de foco terminou. Aproveite uma pausa.",
      });
    }
    completed.current = timer.completedFocusCount;
  }, [timer.completedFocusCount]);

  const focus = timer.phase === "focus";
  const phase = POMODORO_PHASES[timer.phase];
  const cycle = timer.completedFocusCount % 4;
  const unavailable = sessions.isPending || (sessions.isError && !sessions.data);

  return (
    <main className="min-w-0 flex-1 space-y-5 p-5 sm:p-7">
      <PageHeader title="Pomodoro">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="size-4" /> Cada minuto de foco conta
        </span>
      </PageHeader>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section aria-label="Cronômetro Pomodoro" className="card-surface overflow-hidden">
          <div className="bg-welcome px-5 pb-6 pt-5 text-center sm:px-7">
            <div
              role="group"
              aria-label="Modo do cronômetro"
              className="mx-auto flex max-w-md gap-1 rounded-xl bg-background/70 p-1"
            >
              {PHASES.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={timer.phase === key}
                  onClick={() => timer.setPhase(key)}
                  className={cn(
                    "min-w-0 flex-1 rounded-lg px-2 py-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm",
                    timer.phase === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-background",
                  )}
                >
                  {POMODORO_PHASES[key].label}
                </button>
              ))}
            </div>

            <div className="relative mx-auto my-5 grid size-60 place-items-center sm:size-64">
              <svg
                viewBox="0 0 240 240"
                aria-hidden="true"
                className="absolute inset-0 size-full -rotate-90"
              >
                <circle
                  cx="120"
                  cy="120"
                  r="108"
                  fill="none"
                  strokeWidth="6"
                  className="stroke-primary/10"
                />
                <circle
                  cx="120"
                  cy="120"
                  r="108"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={timer.progress * 100}
                  className={cn(
                    "motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300",
                    focus ? "stroke-primary" : "stroke-sky",
                  )}
                />
              </svg>
              <div>
                <span className="mx-auto mb-2 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
                  {focus ? <Timer className="size-4" /> : <Coffee className="size-4" />}
                  {phase.label}
                </span>
                <div
                  role="timer"
                  aria-live="off"
                  aria-label={`${phase.label}: ${clock(timer.remainingSeconds)} restantes`}
                  className="text-6xl font-extrabold tabular-nums tracking-tight text-foreground"
                >
                  {clock(timer.remainingSeconds)}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {focus ? "Um assunto de cada vez." : "Respire. Você merece uma pausa."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                size="lg"
                className="min-w-36 font-bold"
                onClick={timer.isRunning ? timer.pause : timer.start}
              >
                {timer.isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
                {timer.isRunning
                  ? "Pausar"
                  : timer.elapsedSeconds > 0
                    ? "Retomar"
                    : focus
                      ? "Iniciar foco"
                      : "Iniciar pausa"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={timer.finish}
                disabled={focus && timer.elapsedSeconds === 0}
              >
                <Check className="size-4" />
                {focus ? "Finalizar foco" : "Pular pausa"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={timer.reset}
                disabled={timer.elapsedSeconds === 0}
                aria-label="Reiniciar e salvar o foco estudado"
                title="Reiniciar e salvar o foco estudado"
              >
                <RotateCcw className="size-4" />
              </Button>
            </div>
            <p aria-live="polite" className="mt-4 text-xs text-muted-foreground">
              {timer.isRunning
                ? focus
                  ? "Foco em andamento. O tempo continua ao trocar de página."
                  : "Pausa em andamento. Esse tempo não conta como estudo."
                : timer.elapsedSeconds > 0
                  ? "Cronômetro pausado. Seu tempo de foco está preservado."
                  : focus
                    ? "25 minutos de foco, depois 5 minutos para descansar."
                    : "Pausa pronta. Inicie quando quiser."}
            </p>
          </div>

          <div className="space-y-3 px-5 py-4 sm:px-7">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Pausa longa a cada 4 focos completos
              </p>
              <div className="flex gap-1.5" aria-label={`${cycle} de 4 focos no ciclo atual`}>
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "size-2.5 rounded-full",
                      i < cycle ? "bg-primary" : "bg-primary/15",
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ao finalizar, reiniciar ou trocar de modo, o foco já estudado é salvo. Pausas ficam
              fora das horas de estudo.
            </p>
          </div>
        </section>

        <div className="min-w-0 space-y-5">
          <section aria-label="Horas estudadas" className="card-surface p-5">
            <h2 className="font-bold">Seu tempo de estudo</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                {
                  label: "Hoje",
                  value: summary.todaySeconds,
                  color: "bg-primary-soft text-primary",
                },
                { label: "Esta semana", value: summary.weekSeconds, color: "bg-sky-soft text-sky" },
                { label: "Total", value: summary.totalSeconds, color: "bg-coral-soft text-coral" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={cn("min-w-0 rounded-xl px-2 py-4 text-center", stat.color)}
                >
                  <p className="break-words text-sm font-extrabold tabular-nums sm:text-lg">
                    {unavailable ? "—" : formatStudyDuration(stat.value)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {unavailable
                ? sessions.isPending
                  ? "Carregando suas sessões salvas…"
                  : "Totais indisponíveis. Tente carregar o histórico novamente."
                : `${summary.completedSessions} ${summary.completedSessions === 1 ? "foco completo" : "focos completos"} · parciais também contam no tempo`}
            </p>
          </section>

          {timer.storageError && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
            >
              Não foi possível guardar o cronômetro neste navegador. Mantenha esta página aberta e
              finalize o foco para salvar seu tempo na conta.
            </div>
          )}
          {timer.pendingCount > 0 && (
            <div role={timer.saveError ? "alert" : "status"} className="card-surface p-4 text-sm">
              <p className="flex items-start gap-2 font-semibold">
                {timer.isSaving ? (
                  <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
                ) : (
                  <Clock3 className="mt-0.5 size-4 shrink-0" />
                )}
                {timer.saveError
                  ? "Não foi possível salvar na sua conta."
                  : timer.isSaving
                    ? "Salvando seu tempo de estudo…"
                    : "Sessão aguardando conexão para salvar."}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {timer.pendingCount}{" "}
                {timer.pendingCount === 1 ? "sessão pendente" : "sessões pendentes"}.{" "}
                {timer.storageError
                  ? "Mantenha esta página aberta."
                  : "Seu tempo está guardado neste navegador."}{" "}
                Os totais mostram somente sessões já salvas.
              </p>
              {timer.saveError && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => timer.retrySave()}
                >
                  Tentar salvar novamente
                </Button>
              )}
            </div>
          )}

          <section aria-label="Histórico de estudo" className="card-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">Últimas sessões</h2>
              <CheckCircle2 className="size-4 text-primary" />
            </div>
            {sessions.isError && (
              <div role="alert" className="mt-4 text-sm">
                <p>
                  Não foi possível carregar seu histórico. Você pode continuar usando o cronômetro.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void sessions.refetch()}
                  disabled={sessions.isRefetching}
                >
                  Carregar novamente
                </Button>
              </div>
            )}
            {sessions.isPending ? (
              <p role="status" className="py-8 text-center text-sm text-muted-foreground">
                Carregando sessões…
              </p>
            ) : !sessions.isError && sessions.data.length === 0 ? (
              <div className="py-8 text-center">
                <Timer className="mx-auto size-8 text-primary/50" />
                <p className="mt-3 text-sm font-semibold">Seu primeiro foco começa aqui</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Inicie o cronômetro para registrar seus minutos de estudo.
                </p>
              </div>
            ) : (
              <>
                <ul className="mt-3 divide-y">
                  {sessions.data?.slice(0, visibleSessions).map((session) => (
                    <li key={session.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Foco {session.completed ? "completo" : "parcial"}
                        </p>
                        <time dateTime={session.ended_at} className="text-xs text-muted-foreground">
                          {dateFormat.format(new Date(session.ended_at))}
                        </time>
                      </div>
                      <span className="shrink-0 rounded-lg bg-primary-soft px-2.5 py-1.5 text-sm font-bold tabular-nums text-primary">
                        {formatStudyDuration(session.duration_seconds)}
                      </span>
                    </li>
                  ))}
                </ul>
                {(sessions.data?.length ?? 0) > visibleSessions && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => setVisibleSessions((count) => count + 6)}
                  >
                    Mostrar mais sessões
                  </Button>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
