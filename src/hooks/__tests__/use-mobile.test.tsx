import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useIsMobile } from "../use-mobile";

describe("useIsMobile hook", () => {
  let originalInnerWidth: number;
  let eventListeners: Record<string, Function[]> = {};

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    eventListeners = {};

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn((event, callback) => {
          if (!eventListeners[event]) {
            eventListeners[event] = [];
          }
          eventListeners[event].push(callback);
        }),
        removeEventListener: vi.fn((event, callback) => {
          if (eventListeners[event]) {
            eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
          }
        }),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    window.innerWidth = originalInnerWidth;
    vi.restoreAllMocks();
  });

  it("should return true if window innerWidth is below mobile breakpoint", () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("should return false if window innerWidth is above mobile breakpoint", () => {
    window.innerWidth = 1000;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("should respond to resize events", () => {
    window.innerWidth = 1000;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      window.innerWidth = 500;
      if (eventListeners["change"]) {
        eventListeners["change"].forEach(cb => cb());
      }
    });

    expect(result.current).toBe(true);
  });
});
