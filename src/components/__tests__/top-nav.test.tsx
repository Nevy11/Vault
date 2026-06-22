import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ profile: null }),
}));

vi.mock("@/hooks/use-theme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("@/hooks/use-notifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-joint-savings", () => ({
  useJointSavings: () => ({ acceptInvite: vi.fn(), declineInvite: vi.fn() }),
}));

vi.mock("@/hooks/use-receipt-realtime", () => ({
  useReceiptRealtime: () => undefined,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: (props: any) => <a {...props} />,
  useLocation: () => ({ pathname: "/" }),
}));

import { TopNav } from "../top-nav";

describe("TopNav component", () => {
  it("shows landing auth buttons when on landing page and not logged in", async () => {
    render(<TopNav />);

    expect(await screen.findByText("Sign In")).toBeInTheDocument();
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });
});
