import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  advancePomodoro,
  changePomodoroPhase,
  createPomodoroState,
  elapsedPomodoroMs,
  finishPomodoro,
  pausePomodoro,
  POMODORO_PHASES,
  resetPomodoro,
  restorePomodoroState,
  startPomodoro,
  type PomodoroPhase,
  type PomodoroState,
} from "@/lib/pomodoro";
import { useSaveStudySession } from "@/lib/study-data";

type Snapshot = { timer: PomodoroState; storageError: boolean };

function createStore(userId: string) {
  const key = `study:pomodoro:v1:${userId}`;
  const listeners = new Set<() => void>();
  let raw: string | null = null;
  let storageError = false;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    storageError = true;
  }
  let snapshot: Snapshot = { timer: restorePomodoroState(raw), storageError };
  const emit = () => listeners.forEach((listener) => listener());

  function update(transform: (state: PomodoroState) => PomodoroState) {
    let current = snapshot.timer;
    let error = snapshot.storageError;
    try {
      const latest = window.localStorage.getItem(key);
      if (latest !== raw) {
        current = restorePomodoroState(latest);
        raw = latest;
      }
    } catch {
      error = true;
    }
    const next = transform(current);
    if (next !== snapshot.timer) {
      try {
        const serialized = JSON.stringify(next);
        window.localStorage.setItem(key, serialized);
        raw = serialized;
      } catch {
        error = true;
      }
    }
    if (next !== snapshot.timer || error !== snapshot.storageError) {
      snapshot = { timer: next, storageError: error };
      emit();
    }
  }

  return {
    key,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    tick: () => update((state) => advancePomodoro(state, Date.now())),
    start: () => update((state) => startPomodoro(state, Date.now(), crypto.randomUUID())),
    pause: () => update((state) => pausePomodoro(state, Date.now())),
    finish: () => update((state) => finishPomodoro(state, Date.now())),
    reset: () => update((state) => resetPomodoro(state, Date.now())),
    setPhase: (phase: PomodoroPhase) =>
      update((state) => changePomodoroPhase(state, phase, Date.now())),
    acknowledge: (id: string) =>
      update((state) =>
        state.pendingSessions.some((s) => s.id === id)
          ? {
              ...state,
              pendingSessions: state.pendingSessions.filter((s) => s.id !== id),
            }
          : state,
      ),
  };
}

const SERVER_SNAPSHOT: Snapshot = {
  timer: createPomodoroState(),
  storageError: false,
};

export function usePomodoro(userId: string) {
  const store = useMemo(() => createStore(userId), [userId]);
  const { timer, storageError } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => SERVER_SNAPSHOT,
  );
  const [now, setNow] = useState(() => Date.now());
  const { mutateAsync, reset: resetSave, error, isPending } = useSaveStudySession(userId);
  const savingId = useRef<string | null>(null);

  useEffect(() => {
    const tick = () => {
      store.tick();
      setNow(Date.now());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === store.key || event.key === null) tick();
    };
    tick();
    const interval = window.setInterval(tick, 250);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [store]);

  const pending = timer.pendingSessions[0];
  useEffect(() => {
    if (!pending || isPending || error || savingId.current === pending.id) return;
    savingId.current = pending.id;
    // UUID + ON CONFLICT DO NOTHING keeps retries and multiple tabs idempotent.
    void mutateAsync(pending)
      .then(() => store.acknowledge(pending.id))
      .catch(() => {})
      .finally(() => {
        if (savingId.current === pending.id) savingId.current = null;
      });
  }, [pending, isPending, error, mutateAsync, store]);

  const elapsedMs = elapsedPomodoroMs(timer, now);
  const durationMs = POMODORO_PHASES[timer.phase].seconds * 1000;
  return {
    phase: timer.phase,
    isRunning: timer.status === "running",
    remainingSeconds: Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000)),
    elapsedSeconds: Math.floor(elapsedMs / 1000),
    progress: elapsedMs / durationMs,
    completedFocusCount: timer.completedFocusCount,
    pendingCount: timer.pendingSessions.length,
    isSaving: isPending,
    saveError: error?.message ?? null,
    storageError,
    start: store.start,
    pause: store.pause,
    finish: store.finish,
    reset: store.reset,
    setPhase: store.setPhase,
    retrySave: resetSave,
  };
}
