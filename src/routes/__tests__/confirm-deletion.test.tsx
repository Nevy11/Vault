import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfirmDeletionPage } from "../confirm-deletion";
import { supabase } from "@/api/supabase";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  createFileRoute: vi.fn().mockReturnValue(() => ({})),
}));

vi.mock("@/api/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("ConfirmDeletionPage route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows error if no session is found after retries", async () => {
    vi.useFakeTimers();
    
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
    });

    render(<ConfirmDeletionPage />);

    expect(screen.getByText("Confirming Deletion")).toBeInTheDocument();

    // The component does up to 3 retries, waiting 1500ms each time.
    // 3 * 1500 = 4500ms
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(1500);
    }

    vi.useRealTimers(); // Must restore before waitFor

    await waitFor(() => {
      expect(screen.getByText("Verification Failed")).toBeInTheDocument();
      expect(screen.getByText("Session not found. Please try confirming again from settings.")).toBeInTheDocument();
    });
  });

  it("shows error if the intent is not account_deletion", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: { id: "user1", user_metadata: { intent: "other_intent" } },
        },
      },
    });

    render(<ConfirmDeletionPage />);

    await waitFor(() => {
      expect(screen.getByText("Verification Failed")).toBeInTheDocument();
      expect(screen.getByText("Invalid request intent.")).toBeInTheDocument();
    });
  });

  it("schedules deletion successfully when correct intent is provided", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: {
        session: {
          user: { id: "user1", user_metadata: { intent: "account_deletion" } },
        },
      },
    });

    (supabase.functions.invoke as any).mockResolvedValue({ error: null });

    render(<ConfirmDeletionPage />);

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith("send-deletion-email", {
        body: { userId: "user1" },
      });
      expect(screen.getByText("Account Scheduled for Deletion")).toBeInTheDocument();
    });
  });
});
