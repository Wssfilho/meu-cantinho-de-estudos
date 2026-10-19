import { createFileRoute } from "@tanstack/react-router";
import { PomodoroPanel } from "@/components/pomodoro-panel";

export const Route = createFileRoute("/_authenticated/pomodoro")({
  head: () => ({
    meta: [
      { title: "Pomodoro — Study" },
      {
        name: "description",
        content: "Organize seus ciclos de foco e acompanhe suas horas de estudo.",
      },
    ],
  }),
  component: PomodoroPage,
});

function PomodoroPage() {
  const { user } = Route.useRouteContext();
  return <PomodoroPanel userId={user.id} />;
}
