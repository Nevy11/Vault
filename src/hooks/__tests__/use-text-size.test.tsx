import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTextSize, TextSizeProvider } from "../use-text-size";

// Mock dependencies
vi.mock("../use-profile", () => ({
  useProfile: vi.fn(() => ({
    profile: { text_size: "120" },
    refetch: vi.fn(),
  })),
}));

vi.mock("@/api/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user1" } } }),
    },
    from: vi.fn().mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

describe("useTextSize hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.style.fontSize = "";
  });

  it("throws an error if used outside of TextSizeProvider", () => {
    // Suppress React error boundary console.error for this expected error
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTextSize())).toThrow("useTextSize must be used within a TextSizeProvider");
    consoleError.mockRestore();
  });

  it("provides textSize context and sets initial value from profile", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TextSizeProvider>{children}</TextSizeProvider>
    );

    const { result } = renderHook(() => useTextSize(), { wrapper });

    expect(result.current.textSize).toBe("120");
    expect(document.documentElement.style.fontSize).toBe("120%");
  });

  it("updates local state and DOM when setTextSize is called", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TextSizeProvider>{children}</TextSizeProvider>
    );

    const { result } = renderHook(() => useTextSize(), { wrapper });

    act(() => {
      result.current.setTextSize("150");
    });

    expect(result.current.textSize).toBe("150");
    expect(document.documentElement.style.fontSize).toBe("150%");
    expect(localStorage.getItem("text-size")).toBe("150");
  });
});
