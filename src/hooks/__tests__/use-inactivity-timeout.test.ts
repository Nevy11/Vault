import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useInactivityTimeout } from "../use-inactivity-timeout";
import { supabase } from "@/api/supabase";
import { toast } from "sonner";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/api/supabase", () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
  },
}));

describe("useInactivityTimeout hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets a timeout when logged in", async () => {
    renderHook(() => useInactivityTimeout(true));
    
    // Fast forward 10 minutes (600,000 ms)
    await vi.advanceTimersByTimeAsync(600000);
    
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/login" });
    expect(toast.info).toHaveBeenCalledWith("You have been logged out due to inactivity.");
  });

  it("does not set a timeout when not logged in", async () => {
    renderHook(() => useInactivityTimeout(false));
    
    await vi.advanceTimersByTimeAsync(600000);
    
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("resets the timeout on user activity", async () => {
    renderHook(() => useInactivityTimeout(true));
    
    // Fast forward 9 minutes
    await vi.advanceTimersByTimeAsync(540000);
    
    // Simulate activity
    window.dispatchEvent(new Event("mousemove"));
    
    // Fast forward another 2 minutes (total 11 minutes elapsed, but only 2 since activity)
    await vi.advanceTimersByTimeAsync(120000);
    
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    
    // Fast forward the remaining 8 minutes to trigger the timeout
    await vi.advanceTimersByTimeAsync(480000);
    
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it("cleans up event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useInactivityTimeout(true));
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });
});
