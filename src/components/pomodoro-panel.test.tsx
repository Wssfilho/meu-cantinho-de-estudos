import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PomodoroPanel } from "./pomodoro-panel";
import type { StudySession } from "@/lib/study-data";

const { upsert, range, saved } = vi.hoisted(() => ({
  upsert: vi.fn(),
  range: vi.fn(),
  saved: [] as StudySession[],
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => {
      const query = { select: () => query, eq: () => query, order: () => query, range };
      return { ...query, upsert };
    }),
  },
}));

let client: QueryClient;
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 19, 10));
  localStorage.clear();
  saved.length = 0;
  range.mockReset().mockImplementation(async () => ({ data: [...saved], error: null }));
  upsert.mockReset().mockImplementation(async (session) => {
    if (!saved.some((s) => s.id === session.id))
      saved.push({ ...session, created_at: new Date().toISOString() });
    return { error: null };
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
});

function show() {
  render(
    <QueryClientProvider client={client}>
      <PomodoroPanel userId="test-user" />
    </QueryClientProvider>,
  );
}

describe("Pomodoro study flow", () => {
  it("starts, pauses, saves actual focus time and updates history and totals", async () => {
    show();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Iniciar foco" }));
    act(() => vi.advanceTimersByTime(65_000));
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    act(() => vi.advanceTimersByTime(300_000));
    expect(screen.getByRole("timer")).toHaveTextContent("23:55");
    fireEvent.click(screen.getByRole("button", { name: "Finalizar foco" }));
    await flush();
    await flush();
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ duration_seconds: 65, completed: false });
    expect(screen.getByText("Foco parcial")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Horas estudadas" })).getAllByText("1min"),
    ).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Iniciar pausa" })).toBeInTheDocument();
  });

  it("does not add break time to the study totals", async () => {
    show();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Pausa curta" }));
    fireEvent.click(screen.getByRole("button", { name: "Iniciar pausa" }));
    act(() => vi.advanceTimersByTime(40_000));
    fireEvent.click(screen.getByRole("button", { name: "Pular pausa" }));
    await flush();
    expect(upsert).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Iniciar foco" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Horas estudadas" })).getAllByText("0s"),
    ).toHaveLength(3);
  });

  it("keeps the timer usable when history cannot load", async () => {
    range.mockResolvedValue({ data: null, error: new Error("offline") });
    show();
    await flush();
    expect(screen.getByText(/Não foi possível carregar seu histórico/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Iniciar foco" }));
    act(() => vi.advanceTimersByTime(5250));
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("24:55");
  });

  it("exposes a retry for failed saves and updates totals after retry succeeds", async () => {
    upsert.mockResolvedValueOnce({ error: new Error("offline") });
    show();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Iniciar foco" }));
    act(() => vi.advanceTimersByTime(60_000));
    fireEvent.click(screen.getByRole("button", { name: "Finalizar foco" }));
    await flush();
    expect(screen.getByText("Não foi possível salvar na sua conta.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar salvar novamente" }));
    await flush();
    await flush();
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(saved).toHaveLength(1);
    expect(screen.queryByText("Não foi possível salvar na sua conta.")).not.toBeInTheDocument();
    expect(screen.getByText("Foco parcial")).toBeInTheDocument();
  });
});
