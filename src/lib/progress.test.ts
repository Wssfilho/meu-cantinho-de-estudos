import { describe, expect, it } from "vitest";
import { overallProgress, subjectProgress, weeklyActivity } from "./progress";

describe("subject progress", () => {
  it("is 0% when a subject has no topics", () => {
    expect(subjectProgress([])).toBe(0);
  });

  it("is the rounded share of done topics", () => {
    expect(subjectProgress([{ done: true }, { done: false }, { done: false }])).toBe(33);
    expect(subjectProgress([{ done: true }, { done: true }])).toBe(100);
  });

  it("overall progress counts every topic across subjects", () => {
    const subjects = [
      { topics: [{ done: true }, { done: true }, { done: true }] },
      { topics: [{ done: false }] },
    ];
    expect(overallProgress(subjects)).toBe(75);
  });
});

describe("weekly activity", () => {
  it("buckets added and completed topics into this week's weekdays", () => {
    const wednesday = new Date(2026, 9, 21, 12, 0); // Wed 21 Oct 2026
    const monday = new Date(2026, 9, 19, 9, 0).toISOString();
    const lastWeek = new Date(2026, 9, 14, 9, 0).toISOString();
    const days = weeklyActivity(
      [
        { done: true, created_at: monday, completed_at: new Date(2026, 9, 21, 10).toISOString() },
        { done: false, created_at: monday, completed_at: null },
        { done: true, created_at: lastWeek, completed_at: lastWeek },
      ],
      wednesday,
    );
    expect(days[0]).toEqual({ day: "Seg", adicionados: 2, concluidos: 0 });
    expect(days[2].concluidos).toBe(1);
    expect(days.reduce((n, d) => n + d.concluidos, 0)).toBe(1);
  });
});
