import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

import type { ComponentProps } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: ComponentProps<"a"> & { to?: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  useRouterState: vi.fn(() => "/dashboard"),
}));

vi.mock("@/hooks/use-sign-out", () => ({
  useSignOut: () => vi.fn(),
}));

describe("AppShell", () => {
  it("renders navigation items including Matérias with the Update coming soon badge", () => {
    render(<AppShell />);

    // Check that Matérias is rendered
    const materiasLinks = screen.getAllByRole("link", { name: /Matérias/i });
    expect(materiasLinks.length).toBeGreaterThan(0);

    // Check that "Update coming soon" badge text is present in the document
    const badges = screen.getAllByText("Update coming soon");
    expect(badges.length).toBeGreaterThan(0);
  });
});
