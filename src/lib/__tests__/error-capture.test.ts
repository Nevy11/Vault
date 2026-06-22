import { describe, it, expect, vi, beforeEach } from "vitest";
import { consumeLastCapturedError, logErrorToSupabase } from "../error-capture";
import { supabase } from "@/api/supabase";

vi.mock("@/api/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

describe("error-capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear out any captured errors by consuming them
    while (consumeLastCapturedError() !== undefined) {}
  });

  describe("consumeLastCapturedError", () => {
    it("returns undefined if no error was captured", () => {
      expect(consumeLastCapturedError()).toBeUndefined();
    });
  });

  describe("logErrorToSupabase", () => {
    it("calls supabase.rpc when a user is logged in", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: { id: "user123" } } });
      
      const testError = new Error("Test error message");
      await logErrorToSupabase(testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith("Vault Error:", "Test error message", undefined);
      expect(supabase.auth.getUser).toHaveBeenCalled();
      expect(supabase.rpc).toHaveBeenCalledWith("log_security_event", expect.objectContaining({
        p_user_id: "user123",
        p_action: "SYSTEM_ERROR",
        p_status: "error",
      }));
      
      consoleErrorSpy.mockRestore();
    });

    it("does not call supabase.rpc when no user is logged in", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });
      
      const testError = new Error("Test error message 2");
      await logErrorToSupabase(testError);

      expect(supabase.rpc).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("fails silently if an exception occurs during logging", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (supabase.auth.getUser as any).mockRejectedValue(new Error("Network error"));
      
      // Should not throw
      await expect(logErrorToSupabase("Something failed")).resolves.toBeUndefined();
      
      consoleErrorSpy.mockRestore();
    });
  });
});
