import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ profile: null }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: (props: any) => <a {...props} />,
  useLocation: () => ({ pathname: "/dashboard" }),
  useNavigate: () => ({ navigate: vi.fn() }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { AppShell } from "../app-shell";

describe("AppShell component", () => {
  it("renders sidebar with nav items when on dashboard", () => {
    render(
      <AppShell>
        <div>Child</div>
      </AppShell>,
    );

    expect(screen.getByText("Child")).toBeInTheDocument();
    expect(screen.getByText("nav.dashboard")).toBeInTheDocument();
  });
});
