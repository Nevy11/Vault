import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RetrieveAccountPage, Route } from "../retrieve-account";
import { supabase } from "@/api/supabase";

let mockSearchToken: string | undefined = "valid-token";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  createFileRoute: vi.fn().mockReturnValue(() => ({})),
}));

// Route is imported from the file, but we can override the useSearch directly on the imported Route object.
// We'll mock it below.
Route.useSearch = vi.fn(() => ({ token: mockSearchToken }));

vi.mock("@/api/supabase", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("RetrieveAccountPage route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchToken = "valid-token";
  });

  it("shows error if no token is provided in the URL", async () => {
    Route.useSearch = vi.fn(() => ({ token: undefined }));
    
    render(<RetrieveAccountPage />);

    await waitFor(() => {
      expect(screen.getByText("Restoration Failed")).toBeInTheDocument();
      expect(screen.getByText("No recovery token provided.")).toBeInTheDocument();
    });
    
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("shows success if the function call succeeds", async () => {
    Route.useSearch = vi.fn(() => ({ token: "valid-token" }));
    (supabase.functions.invoke as any).mockResolvedValue({ error: null });

    render(<RetrieveAccountPage />);

    expect(screen.getByText("Restoring Account")).toBeInTheDocument();

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith("restore-account", {
        body: { token: "valid-token" },
      });
      expect(screen.getByText("Welcome Back!")).toBeInTheDocument();
    });
  });

  it("shows error if the function call fails", async () => {
    Route.useSearch = vi.fn(() => ({ token: "valid-token" }));
    (supabase.functions.invoke as any).mockResolvedValue({
      error: new Error(JSON.stringify({ error: "Token expired" })),
    });

    render(<RetrieveAccountPage />);

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalled();
      expect(screen.getByText("Restoration Failed")).toBeInTheDocument();
      expect(screen.getByText("Token expired")).toBeInTheDocument();
    });
  });
});
