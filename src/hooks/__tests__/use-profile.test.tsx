import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useProfile } from "../use-profile";
import { supabase } from "@/api/supabase";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/api/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock("@/lib/i18n", () => ({
  default: {
    language: "en",
    changeLanguage: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useProfile hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    
    // Mock onAuthStateChange
    (supabase.auth.onAuthStateChange as any).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("returns null profile if no user session exists", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
    });

    const { result } = renderHook(() => useProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
  });

  it("fetches profile and preferences when a session exists", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: "test-user" } } },
    });

    const mockProfileSingle = vi.fn().mockResolvedValue({
      data: { id: "test-user", first_name: "John" },
      error: null,
    });
    const mockProfileEq = vi.fn().mockReturnValue({ maybeSingle: mockProfileSingle });
    const mockProfileSelect = vi.fn().mockReturnValue({ eq: mockProfileEq });

    const mockPrefSingle = vi.fn().mockResolvedValue({
      data: { language: "es", theme: "dark", text_size: "120" },
      error: null,
    });
    const mockPrefEq = vi.fn().mockReturnValue({ maybeSingle: mockPrefSingle });
    const mockPrefSelect = vi.fn().mockReturnValue({ eq: mockPrefEq });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === "profiles") return { select: mockProfileSelect };
      if (table === "user_preferences") return { select: mockPrefSelect };
    });

    const { result } = renderHook(() => useProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile).toEqual({
      id: "test-user",
      first_name: "John",
      language: "es",
      theme: "dark",
      text_size: "120",
    });
  });
});
