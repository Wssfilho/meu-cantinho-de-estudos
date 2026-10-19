export type TopicLike = { done: boolean; completed_at: string | null; created_at: string };

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

/** Per weekday (Mon→Sun) of the current week: topics added and topics completed. */
export function weeklyActivity(topics: TopicLike[], now: Date = new Date()) {
  const start = startOfWeekMonday(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const days = WEEKDAY_LABELS.map((label) => ({ day: label, adicionados: 0, concluidos: 0 }));

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
