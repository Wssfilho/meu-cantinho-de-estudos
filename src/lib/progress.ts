export type TopicLike = {
  done: boolean;
  completed_at: string | null;
  created_at: string;
};

/** Percent (0–100, rounded) of topics marked done. No topics = 0%. */
export function subjectProgress(topics: Pick<TopicLike, "done">[]): number {
  if (topics.length === 0) return 0;
  const done = topics.filter((t) => t.done).length;
  return Math.round((done / topics.length) * 100);
}

/** Overall percent across every topic of every subject. */
export function overallProgress(subjects: { topics: Pick<TopicLike, "done">[] }[]): number {
  return subjectProgress(subjects.flatMap((s) => s.topics));
}

/** Monday 00:00 (local time) of the week containing `now`. */
export function startOfWeekMonday(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d;
}

export const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type StudyTimeLike = {
  id: string;
  ended_at: string;
  duration_seconds: number;
  completed: boolean;
};

/** Only saved focus records count; dates use the user's local calendar. */
export function studyTimeSummary(sessions: StudyTimeLike[], now: Date = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const week = startOfWeekMonday(now);
  const nextWeek = new Date(week);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const summary = {
    todaySeconds: 0,
    weekSeconds: 0,
    totalSeconds: 0,
    completedSessions: 0,
  };
  const seen = new Set<string>();
  for (const session of sessions) {
    const end = new Date(session.ended_at);
    if (
      seen.has(session.id) ||
      !Number.isFinite(end.getTime()) ||
      !Number.isInteger(session.duration_seconds) ||
      session.duration_seconds <= 0
    )
      continue;
    seen.add(session.id);
    summary.totalSeconds += session.duration_seconds;
    if (session.completed) summary.completedSessions += 1;
    if (end >= today && end < tomorrow) summary.todaySeconds += session.duration_seconds;
    if (end >= week && end < nextWeek) summary.weekSeconds += session.duration_seconds;
  }
  return summary;
}

export function formatStudyDuration(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  if (minutes > 0) return `${minutes}min`;
  return `${total}s`;
}

/** Per weekday (Mon→Sun) of the current week: topics added and topics completed. */
export function weeklyActivity(topics: TopicLike[], now: Date = new Date()) {
  const start = startOfWeekMonday(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const days = WEEKDAY_LABELS.map((label) => ({
    day: label,
    adicionados: 0,
    concluidos: 0,
  }));

  const bucket = (iso: string | null): number | null => {
    if (!iso) return null;
    const date = new Date(iso);
    if (date < start || date >= end) return null;
    return (date.getDay() + 6) % 7;
  };

  for (const t of topics) {
    const a = bucket(t.created_at);
    if (a !== null) days[a]!.adicionados += 1;
    const c = t.done ? bucket(t.completed_at) : null;
    if (c !== null) days[c]!.concluidos += 1;
  }
  return days;
}
