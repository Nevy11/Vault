import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLedger } from "../use-ledger";
import { supabase } from "@/api/supabase";

vi.mock("@/api/supabase", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

let mockProfile: { id: string } | null = { id: "user123" };

vi.mock("@/hooks/use-profile", () => ({
  useProfile: vi.fn(() => ({
    profile: mockProfile,
  })),
}));

describe("useLedger hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfile = { id: "user123" };
  });

  it("does not fetch if enabled is false", async () => {
    const { result } = renderHook(() => useLedger(false));
    
    expect(result.current.loading).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it("fetches ledger entries and sets up realtime subscription", async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [{ id: "entry1", amount: 100 }],
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const mockChannelInstance = { on: vi.fn(), subscribe: vi.fn() };
    mockChannelInstance.on.mockReturnValue(mockChannelInstance);
    mockChannelInstance.subscribe.mockReturnValue(mockChannelInstance);
    (supabase.channel as any).mockReturnValue(mockChannelInstance);

    const { result } = renderHook(() => useLedger());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.entries).toEqual([{ id: "entry1", amount: 100 }]);
    
    expect(supabase.from).toHaveBeenCalledWith("ledger_entries");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user123");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });

    expect(supabase.channel).toHaveBeenCalledWith(expect.stringContaining("ledger_changes_user123_"));
    expect(mockChannelInstance.on).toHaveBeenCalled();
    expect(mockChannelInstance.subscribe).toHaveBeenCalled();
  });

  it("filters by currency if provided", async () => {
    const mockEqCurrency = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder = vi.fn().mockReturnValue({ eq: mockEqCurrency });
    const mockEqUser = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const mockChannelInstance = { on: vi.fn(), subscribe: vi.fn() };
    mockChannelInstance.on.mockReturnValue(mockChannelInstance);
    mockChannelInstance.subscribe.mockReturnValue(mockChannelInstance);
    (supabase.channel as any).mockReturnValue(mockChannelInstance);

    const { result } = renderHook(() => useLedger(true, "KES"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockEqUser).toHaveBeenCalledWith("user_id", "user123");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockEqCurrency).toHaveBeenCalledWith("currency", "KES");
  });

  it("cleans up channel on unmount", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const mockChannelInstance = { on: vi.fn(), subscribe: vi.fn() };
    mockChannelInstance.on.mockReturnValue(mockChannelInstance);
    mockChannelInstance.subscribe.mockReturnValue(mockChannelInstance);
    (supabase.channel as any).mockReturnValue(mockChannelInstance);

    const { unmount } = renderHook(() => useLedger());

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalled();
    });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannelInstance);
  });
});
