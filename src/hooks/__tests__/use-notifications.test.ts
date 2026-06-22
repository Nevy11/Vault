import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useNotifications } from "../use-notifications";
import { supabase } from "@/api/supabase";

vi.mock("@/api/supabase", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

let mockProfile: { id: string } | null = { id: "user1" };

vi.mock("@/hooks/use-profile", () => ({
  useProfile: vi.fn(() => ({
    profile: mockProfile,
  })),
}));

describe("useNotifications hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfile = { id: "user1" };
  });

  it("does not fetch if no profile exists", async () => {
    mockProfile = null;
    const { result } = renderHook(() => useNotifications());
    
    expect(result.current.loading).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it("fetches notifications and sets up realtime subscription", async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      data: [{ id: "notif1", is_read: false }],
      error: null,
    });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const mockChannelInstance = { on: vi.fn(), subscribe: vi.fn() };
    mockChannelInstance.on.mockReturnValue(mockChannelInstance);
    mockChannelInstance.subscribe.mockReturnValue(mockChannelInstance);
    (supabase.channel as any).mockReturnValue(mockChannelInstance);

    const { result } = renderHook(() => useNotifications());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toEqual([{ id: "notif1", is_read: false }]);
    expect(result.current.unreadCount).toBe(1);
    
    expect(supabase.from).toHaveBeenCalledWith("notifications");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user1");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });

    expect(supabase.channel).toHaveBeenCalledWith(expect.stringContaining("notifications-updates-user1-"));
    expect(mockChannelInstance.on).toHaveBeenCalled();
    expect(mockChannelInstance.subscribe).toHaveBeenCalled();
  });

  it("allows marking a single notification as read", async () => {
    const mockLimit = vi.fn().mockResolvedValue({
      data: [
        { id: "notif1", is_read: false },
        { id: "notif2", is_read: false },
      ],
      error: null,
    });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEqSelect = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqSelect });
    
    const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

    (supabase.from as any).mockImplementation(() => {
      // It's called for select and for update
      return { select: mockSelect, update: mockUpdate };
    });

    const mockChannelInstance = { on: vi.fn(), subscribe: vi.fn() };
    mockChannelInstance.on.mockReturnValue(mockChannelInstance);
    mockChannelInstance.subscribe.mockReturnValue(mockChannelInstance);
    (supabase.channel as any).mockReturnValue(mockChannelInstance);

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.unreadCount).toBe(2);

    await act(async () => {
      await result.current.markAsRead("notif1");
    });

    expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
    expect(mockEqUpdate).toHaveBeenCalledWith("id", "notif1");
    
    expect(result.current.notifications[0].is_read).toBe(true);
    expect(result.current.notifications[1].is_read).toBe(false);
    expect(result.current.unreadCount).toBe(1);
  });
});
