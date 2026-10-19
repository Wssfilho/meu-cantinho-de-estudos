export const POMODORO_PHASES = {
  focus: { label: "Foco", seconds: 25 * 60 },
  shortBreak: { label: "Pausa curta", seconds: 5 * 60 },
  longBreak: { label: "Pausa longa", seconds: 15 * 60 },
} as const;

export type PomodoroPhase = keyof typeof POMODORO_PHASES;
export type StudySessionInput = {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  target_seconds: number;
  completed: boolean;
};

export type PomodoroState = {
  version: 1;
  phase: PomodoroPhase;
  status: "idle" | "running" | "paused";
  sessionId: string | null;
  startedAt: number | null;
  accumulatedMs: number;
  runningSince: number | null;
  completedFocusCount: number;
  pendingSessions: StudySessionInput[];
};

export function createPomodoroState(): PomodoroState {
  return {
    version: 1,
    phase: "focus",
    status: "idle",
    sessionId: null,
    startedAt: null,
    accumulatedMs: 0,
    runningSince: null,
    completedFocusCount: 0,
    pendingSessions: [],
  };
}

export function elapsedPomodoroMs(state: PomodoroState, now: number): number {
  const runningMs =
    state.status === "running" && state.runningSince !== null
      ? Math.max(0, now - state.runningSince)
      : 0;
  return Math.min(POMODORO_PHASES[state.phase].seconds * 1000, state.accumulatedMs + runningMs);
}

function readyPhase(state: PomodoroState, phase: PomodoroPhase): PomodoroState {
  return {
    ...state,
    phase,
    status: "idle",
    sessionId: null,
    startedAt: null,
    accumulatedMs: 0,
    runningSince: null,
  };
}

function recordFocus(state: PomodoroState, now: number): PomodoroState {
  if (state.phase !== "focus" || !state.sessionId || state.startedAt === null) return state;
  const target = POMODORO_PHASES.focus.seconds;
  const seconds = Math.floor(elapsedPomodoroMs(state, now) / 1000);
  if (seconds < 1) return state;
  // A sleeping/background tab records the actual deadline, never the time it wakes.
  const endedAt =
    seconds === target && state.runningSince !== null
      ? state.runningSince + target * 1000 - state.accumulatedMs
      : now;
  const session: StudySessionInput = {
    id: state.sessionId,
    started_at: new Date(state.startedAt).toISOString(),
    ended_at: new Date(endedAt).toISOString(),
    duration_seconds: seconds,
    target_seconds: target,
    completed: seconds === target,
  };
  return {
    ...state,
    completedFocusCount: state.completedFocusCount + (session.completed ? 1 : 0),
    pendingSessions: state.pendingSessions.some((s) => s.id === session.id)
      ? state.pendingSessions
      : [...state.pendingSessions, session],
  };
}

export function advancePomodoro(state: PomodoroState, now: number): PomodoroState {
  if (
    state.status !== "running" ||
    elapsedPomodoroMs(state, now) < POMODORO_PHASES[state.phase].seconds * 1000
  )
    return state;
  if (state.phase !== "focus") return readyPhase(state, "focus");
  const recorded = recordFocus(state, now);
  return readyPhase(recorded, recorded.completedFocusCount % 4 === 0 ? "longBreak" : "shortBreak");
}

export function startPomodoro(state: PomodoroState, now: number, id: string): PomodoroState {
  const current = advancePomodoro(state, now);
  // If a deadline just passed, leave the next phase ready for an explicit start.
  if (current !== state || current.status === "running") return current;
  return {
    ...current,
    status: "running",
    sessionId: current.sessionId ?? id,
    startedAt: current.startedAt ?? now,
    runningSince: now,
  };
}

export function pausePomodoro(state: PomodoroState, now: number): PomodoroState {
  const current = advancePomodoro(state, now);
  if (current.status !== "running") return current;
  return {
    ...current,
    status: "paused",
    accumulatedMs: elapsedPomodoroMs(current, now),
    runningSince: null,
  };
}

export function finishPomodoro(state: PomodoroState, now: number): PomodoroState {
  const current = advancePomodoro(state, now);
  if (current !== state) return current;
  const recorded = recordFocus(current, now);
  return readyPhase(recorded, current.phase === "focus" ? "shortBreak" : "focus");
}

export function changePomodoroPhase(
  state: PomodoroState,
  phase: PomodoroPhase,
  now: number,
): PomodoroState {
  const current = advancePomodoro(state, now);
  if (current.phase === phase) return current;
  return readyPhase(recordFocus(current, now), phase);
}

export function resetPomodoro(state: PomodoroState, now: number): PomodoroState {
  const current = advancePomodoro(state, now);
  return readyPhase(recordFocus(current, now), state.phase);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validStudySession(value: unknown): value is StudySessionInput {
  if (!value || typeof value !== "object") return false;
  const s = value as StudySessionInput;
  const start = typeof s.started_at === "string" ? Date.parse(s.started_at) : NaN;
  const end = typeof s.ended_at === "string" ? Date.parse(s.ended_at) : NaN;
  return (
    typeof s.id === "string" &&
    UUID.test(s.id) &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    end > start &&
    Number.isInteger(s.duration_seconds) &&
    s.duration_seconds > 0 &&
    Number.isInteger(s.target_seconds) &&
    s.target_seconds > 0 &&
    s.target_seconds <= 86400 &&
    s.duration_seconds <= s.target_seconds &&
    s.duration_seconds <= (end - start) / 1000 + 1 &&
    typeof s.completed === "boolean" &&
    s.completed === (s.duration_seconds === s.target_seconds)
  );
}

/** Reject corrupt/untrusted storage rather than counting an invalid session. */
export function restorePomodoroState(raw: string | null): PomodoroState {
  if (!raw) return createPomodoroState();
  try {
    const s = JSON.parse(raw) as PomodoroState;
    const validTime = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 8.64e15;
    if (
      s.version !== 1 ||
      !Object.hasOwn(POMODORO_PHASES, s.phase) ||
      !["idle", "running", "paused"].includes(s.status) ||
      !Number.isInteger(s.completedFocusCount) ||
      s.completedFocusCount < 0 ||
      !Number.isFinite(s.accumulatedMs) ||
      s.accumulatedMs < 0 ||
      s.accumulatedMs > POMODORO_PHASES[s.phase].seconds * 1000 ||
      !Array.isArray(s.pendingSessions) ||
      !s.pendingSessions.every(validStudySession) ||
      new Set(s.pendingSessions.map((p) => p.id)).size !== s.pendingSessions.length
    )
      return createPomodoroState();
    if (s.status === "idle") {
      if (
        s.sessionId !== null ||
        s.startedAt !== null ||
        s.runningSince !== null ||
        s.accumulatedMs !== 0
      )
        return createPomodoroState();
    } else if (
      typeof s.sessionId !== "string" ||
      !UUID.test(s.sessionId) ||
      !validTime(s.startedAt) ||
      (s.status === "running"
        ? !validTime(s.runningSince) || s.runningSince! < s.startedAt!
        : s.runningSince !== null)
    )
      return createPomodoroState();
    return s;
  } catch {
    return createPomodoroState();
  }
}
