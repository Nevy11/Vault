import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWallet } from "../use-wallet";
import { supabase } from "@/api/supabase";

vi.mock("@/api/supabase", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

let mockProfile: { id: string } | null = { id: "test-user-id" };

vi.mock("@/hooks/use-profile", () => ({
  useProfile: vi.fn(() => ({
    profile: mockProfile,
  })),
}));

describe("useWallet hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfile = { id: "test-user-id" };
  });

  it("returns null wallet and false loading immediately if no profile exists", async () => {
    mockProfile = null;
    const { result } = renderHook(() => useWallet());
    
    expect(result.current.loading).toBe(false);
    expect(result.current.wallet).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("fetches wallet data and sets up a realtime subscription if profile exists", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { balance: 1500.5, currency: "USD" },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const mockChannelInstance = { on: vi.fn(), subscribe: vi.fn() };
    mockChannelInstance.on.mockReturnValue(mockChannelInstance);
    mockChannelInstance.subscribe.mockReturnValue(mockChannelInstance);
    (supabase.channel as any).mockReturnValue(mockChannelInstance);

    const { result } = renderHook(() => useWallet());

    expect(result.current.loading).toBe(true);
    expect(result.current.wallet).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.wallet).toEqual({ balance: 1500.5, currency: "USD" });
    
    expect(supabase.from).toHaveBeenCalledWith("wallets");
    expect(mockEq).toHaveBeenCalledWith("user_id", "test-user-id");
    
    expect(supabase.channel).toHaveBeenCalledWith(expect.stringContaining("wallet_changes_test-user-id_"));
    expect(mockChannelInstance.on).toHaveBeenCalled();
    expect(mockChannelInstance.subscribe).toHaveBeenCalled();
  });

  it("cleans up the realtime channel on unmount", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { balance: 100, currency: "USD" },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const mockChannelInstance = { on: vi.fn(), subscribe: vi.fn() };
    mockChannelInstance.on.mockReturnValue(mockChannelInstance);
    mockChannelInstance.subscribe.mockReturnValue(mockChannelInstance);
    (supabase.channel as any).mockReturnValue(mockChannelInstance);

    const { unmount } = renderHook(() => useWallet());
    
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalled();
    });

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannelInstance);
  });
});
