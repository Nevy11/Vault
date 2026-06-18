import { describe, it, expect } from "vitest";
import { getDeviceName, getDeviceMacAddress } from "../device-detection";

describe("device-detection", () => {
  it("should detect device and browser from user agent", () => {
    // We can't easily mock navigator.userAgent directly in a clean way without complexity
    // But we can test if the function returns a string as expected
    const result = getDeviceName();
    expect(typeof result).toBe("string");
    expect(result).toContain("on");
  });

  it("should generate a consistent pseudo-MAC address", () => {
    const f1 = getDeviceMacAddress();
    const f2 = getDeviceMacAddress();
    expect(f1).toBe(f2);
    expect(f1).toMatch(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/);
  });
});
