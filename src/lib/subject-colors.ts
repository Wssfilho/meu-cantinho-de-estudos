export const SUBJECT_COLORS = ["coral", "sky", "indigo", "amber", "teal"] as const;
export type SubjectColor = (typeof SUBJECT_COLORS)[number];

type ColorClasses = { dot: string; bar: string; text: string; soft: string; label: string };

// Literal class strings so Tailwind keeps them.
const MAP: Record<SubjectColor, ColorClasses> = {
  coral: { dot: "bg-subject-coral", bar: "bg-subject-coral", text: "text-subject-coral", soft: "bg-coral-soft", label: "Coral" },
  sky: { dot: "bg-subject-sky", bar: "bg-subject-sky", text: "text-subject-sky", soft: "bg-sky-soft", label: "Azul" },
  indigo: { dot: "bg-subject-indigo", bar: "bg-subject-indigo", text: "text-subject-indigo", soft: "bg-primary-soft", label: "Índigo" },
  amber: { dot: "bg-subject-amber", bar: "bg-subject-amber", text: "text-subject-amber", soft: "bg-muted", label: "Âmbar" },
  teal: { dot: "bg-subject-teal", bar: "bg-subject-teal", text: "text-subject-teal", soft: "bg-muted", label: "Verde" },
};

export function subjectColor(color: string | null | undefined): ColorClasses {
  return MAP[(color as SubjectColor) ?? "sky"] ?? MAP.sky;
}
