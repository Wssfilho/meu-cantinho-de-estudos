import { describe, expect, it } from "vitest";
import {
  formatStudyDuration,
  overallProgress,
  studyTimeSummary,
  subjectProgress,
  weeklyActivity,
} from "./progress";

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
        {
          done: true,
          created_at: monday,
          completed_at: new Date(2026, 9, 21, 10).toISOString(),
        },
        { done: false, created_at: monday, completed_at: null },
        { done: true, created_at: lastWeek, completed_at: lastWeek },
      ],
      wednesday,
    );
    expect(days[0]).toEqual({ day: "Seg", adicionados: 2, concluidos: 0 });
    expect(days[2]?.concluidos).toBe(1);
    expect(days.reduce((n, d) => n + d.concluidos, 0)).toBe(1);
  });
});

describe("saved study time", () => {
  it("totals focus sessions by local calendar day and Monday week without duplicates", () => {
    const now = new Date(2026, 9, 21, 12);
    const make = (id: string, date: Date, seconds: number, completed = false) => ({
      id,
      ended_at: date.toISOString(),
      duration_seconds: seconds,
      completed,
    });
    const today = make("today", new Date(2026, 9, 21, 8), 1500, true);
    const sessions = [
      today,
      today,
      make("monday", new Date(2026, 9, 19), 120),
      make("last-week", new Date(2026, 9, 18, 23, 59), 300),
      make("invalid", new Date(2026, 9, 21), -20),
      { ...today, id: "bad-date", ended_at: "invalid" },
    ];
    expect(studyTimeSummary(sessions, now)).toEqual({
      todaySeconds: 1500,
      weekSeconds: 1620,
      totalSeconds: 1920,
      completedSessions: 1,
    });
  });

  it("shows hours, minutes, and sub-minute study time", () => {
    expect(formatStudyDuration(5100)).toBe("1h 25min");
    expect(formatStudyDuration(7200)).toBe("2h 00min");
    expect(formatStudyDuration(1500)).toBe("25min");
    expect(formatStudyDuration(45)).toBe("45s");
    expect(formatStudyDuration(0)).toBe("0s");
    expect(formatStudyDuration(NaN)).toBe("0s");
  });
});
