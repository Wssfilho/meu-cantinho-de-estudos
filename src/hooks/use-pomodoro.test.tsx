import { StrictMode, type ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePomodoro } from "./use-pomodoro";
import { createPomodoroState, startPomodoro } from "@/lib/pomodoro";

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(() => ({ upsert })) },
}));

const USER = "92000000-0000-4000-8000-000000000001";
const SESSION = "93000000-0000-4000-8000-000000000001";
const NOW = new Date(2026, 9, 19, 10).getTime();
const key = `study:pomodoro:v1:${USER}`;
const clients: QueryClient[] = [];

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  return (
    <StrictMode>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </StrictMode>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  localStorage.clear();
  upsert.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Pomodoro persistence and database boundary", () => {
  it("restores focus after navigation and excludes a long pause", async () => {
    const first = renderHook(() => usePomodoro(USER), { wrapper });
    act(() => first.result.current.start());
    act(() => {
      vi.advanceTimersByTime(60_000);
      first.result.current.pause();
    });
    expect(first.result.current.elapsedSeconds).toBe(60);
    first.unmount();
    vi.setSystemTime(NOW + 600_000);
    const restored = renderHook(() => usePomodoro(USER), { wrapper });
    expect(restored.result.current.elapsedSeconds).toBe(60);
    expect(restored.result.current.isRunning).toBe(false);
    act(() => restored.result.current.start());
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      restored.result.current.finish();
    });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0]?.[0]).toMatchObject({
      user_id: USER,
      duration_seconds: 90,
      completed: false,
    });
    expect(restored.result.current.pendingCount).toBe(0);
  });

  it("saves an expired restored focus once, even with StrictMode effects", async () => {
    localStorage.setItem(
      key,
      JSON.stringify(startPomodoro(createPomodoroState(), NOW - 3_600_000, SESSION)),
    );
    const hook = renderHook(() => usePomodoro(USER), { wrapper });
    await act(async () => {});
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert.mock.calls[0]?.[0]).toMatchObject({
      id: SESSION,
      duration_seconds: 1500,
      completed: true,
    });
    expect(upsert.mock.calls[0]?.[1]).toEqual({
      onConflict: "id",
      ignoreDuplicates: true,
    });
    expect(hook.result.current.phase).toBe("shortBreak");
    expect(hook.result.current.isRunning).toBe(false);
    expect(hook.result.current.pendingCount).toBe(0);
  });

  it("retains failed saves and retries with the same id without losing study time", async () => {
    upsert.mockResolvedValueOnce({ error: new Error("offline") });
    const hook = renderHook(() => usePomodoro(USER), { wrapper });
    act(() => hook.result.current.start());
    await act(async () => {
      vi.advanceTimersByTime(10_000);
      hook.result.current.finish();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(hook.result.current.saveError).toBe("offline");
    expect(hook.result.current.pendingCount).toBe(1);
    expect(JSON.parse(localStorage.getItem(key)!).pendingSessions).toHaveLength(1);
    await act(async () => hook.result.current.retrySave());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0]?.[0].id).toBe(upsert.mock.calls[1]?.[0].id);
    expect(hook.result.current.pendingCount).toBe(0);
  });

  it("isolates the running timer when the signed-in user changes", () => {
    const hook = renderHook(({ user }) => usePomodoro(user), {
      wrapper,
      initialProps: { user: USER },
    });
    act(() => hook.result.current.start());
    act(() => vi.advanceTimersByTime(15_000));
    hook.rerender({ user: "other-user" });
    expect(hook.result.current.elapsedSeconds).toBe(0);
    expect(hook.result.current.isRunning).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("keeps counting in memory if browser storage is full", () => {
    const hook = renderHook(() => usePomodoro(USER), { wrapper });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    act(() => hook.result.current.start());
    act(() => vi.advanceTimersByTime(10_000));
    expect(hook.result.current.storageError).toBe(true);
    expect(hook.result.current.elapsedSeconds).toBe(10);
    expect(hook.result.current.isRunning).toBe(true);
    setItem.mockRestore();
  });
});
