import { describe, expect, it } from "vitest";
import {
  advancePomodoro,
  changePomodoroPhase,
  createPomodoroState,
  elapsedPomodoroMs,
  finishPomodoro,
  pausePomodoro,
  resetPomodoro,
  restorePomodoroState,
  startPomodoro,
  validStudySession,
} from "./pomodoro";

const ID = "91000000-0000-4000-8000-000000000001";
const START = new Date(2026, 9, 19, 10).getTime();
const running = () => startPomodoro(createPomodoroState(), START, ID);

describe("Pomodoro focus accounting", () => {
  it("uses elapsed time instead of interval ticks and excludes paused time", () => {
    const paused = pausePomodoro(running(), START + 60_000);
    expect(elapsedPomodoroMs(paused, START + 600_000)).toBe(60_000);
    const resumed = startPomodoro(paused, START + 600_000, crypto.randomUUID());
    const finished = finishPomodoro(resumed, START + 630_000);
    expect(finished.pendingSessions[0]).toMatchObject({
      id: ID,
      duration_seconds: 90,
      completed: false,
    });
    expect(finished.phase).toBe("shortBreak");
  });

  it("caps a sleeping tab at the deadline and records exactly one session", () => {
    const finished = advancePomodoro(running(), START + 86_400_000);
    expect(finished.pendingSessions).toHaveLength(1);
    expect(finished.pendingSessions[0]).toMatchObject({
      duration_seconds: 1500,
      completed: true,
      ended_at: new Date(START + 1_500_000).toISOString(),
    });
    expect(finished.status).toBe("idle");
    expect(advancePomodoro(finished, START + 172_800_000)).toBe(finished);
  });

  it("calculates the correct deadline after a pause", () => {
    const paused = pausePomodoro(running(), START + 60_000);
    const resumed = startPomodoro(paused, START + 600_000, ID);
    const finished = advancePomodoro(resumed, START + 5_000_000);
    expect(finished.pendingSessions[0]?.ended_at).toBe(new Date(START + 2_040_000).toISOString());
    expect(finished.pendingSessions[0]?.duration_seconds).toBe(1500);
  });

  it("never counts breaks as study time or starts a next phase automatically", () => {
    const ready = changePomodoroPhase(createPomodoroState(), "longBreak", START);
    const completed = advancePomodoro(startPomodoro(ready, START, ID), START + 900_000);
    expect(completed.phase).toBe("focus");
    expect(completed.status).toBe("idle");
    expect(completed.pendingSessions).toEqual([]);
    expect(completed.completedFocusCount).toBe(0);
  });

  it("offers a long break after each four completed focus sessions", () => {
    let state = createPomodoroState();
    for (let i = 0; i < 4; i++) {
      const now = START + i * 2_000_000;
      state = changePomodoroPhase(state, "focus", now);
      state = advancePomodoro(startPomodoro(state, now, crypto.randomUUID()), now + 1_500_000);
      expect(state.phase).toBe(i === 3 ? "longBreak" : "shortBreak");
    }
    expect(state.pendingSessions).toHaveLength(4);
  });

  it("keeps accumulated focus when resetting or switching modes", () => {
    const reset = resetPomodoro(running(), START + 70_000);
    expect(reset.pendingSessions[0]?.duration_seconds).toBe(70);
    expect(reset.phase).toBe("focus");
    expect(reset.status).toBe("idle");
    const changed = changePomodoroPhase(running(), "longBreak", START + 40_000);
    expect(changed.pendingSessions[0]?.duration_seconds).toBe(40);
    expect(changed.phase).toBe("longBreak");
    expect(changed.completedFocusCount).toBe(0);
  });

  it("does not create zero-second records or restart a running timer", () => {
    const state = running();
    expect(startPomodoro(state, START + 1000, crypto.randomUUID())).toBe(state);
    expect(finishPomodoro(state, START + 999).pendingSessions).toEqual([]);
  });

  it("does not count a backwards clock as negative elapsed time", () => {
    expect(elapsedPomodoroMs(running(), START - 60_000)).toBe(0);
  });
});

describe("Pomodoro restoration and session validation", () => {
  it("restores a running focus and its original session identifier", () => {
    const state = restorePomodoroState(JSON.stringify(running()));
    expect(elapsedPomodoroMs(state, START + 120_000)).toBe(120_000);
    expect(finishPomodoro(state, START + 120_000).pendingSessions[0]?.id).toBe(ID);
  });

  it("restores the persistent queue and rejects malformed storage", () => {
    const state = finishPomodoro(running(), START + 50_000);
    expect(restorePomodoroState(JSON.stringify(state))).toEqual(state);
    for (const raw of [
      "broken",
      "null",
      "{}",
      JSON.stringify({ ...running(), phase: "__proto__" }),
      JSON.stringify({ ...running(), runningSince: null }),
      JSON.stringify({
        ...state,
        pendingSessions: [...state.pendingSessions, ...state.pendingSessions],
      }),
    ]) {
      expect(restorePomodoroState(raw)).toEqual(createPomodoroState());
    }
  });

  it("rejects negative, excessive, or inconsistent session durations", () => {
    const session = finishPomodoro(running(), START + 50_000).pendingSessions[0]!;
    expect(validStudySession(session)).toBe(true);
    expect(validStudySession({ ...session, duration_seconds: -1 })).toBe(false);
    expect(validStudySession({ ...session, duration_seconds: 100 })).toBe(false);
    expect(validStudySession({ ...session, completed: true })).toBe(false);
    expect(validStudySession({ ...session, id: "invalid" })).toBe(false);
  });
});
