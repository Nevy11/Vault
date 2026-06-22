import { describe, it, expect, vi, beforeEach } from "vitest";
import { getConversionRate } from "../currency-utils";
import { supabase } from "@/api/supabase";

// Mock supabase
vi.mock("@/api/supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("getConversionRate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 1 if from and to are the same", async () => {
    const rate = await getConversionRate("USD", "USD");
    expect(rate).toBe(1);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns the conversion rate if found in the database", async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { rate: 1.5 }, error: null });
    const mockEqTo = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEqFrom = vi.fn().mockReturnValue({ eq: mockEqTo });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqFrom });
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const rate = await getConversionRate("USD", "EUR");
    expect(rate).toBe(1.5);
    expect(supabase.from).toHaveBeenCalledWith("currency_rates");
    expect(mockSelect).toHaveBeenCalledWith("rate");
    expect(mockEqFrom).toHaveBeenCalledWith("from_currency", "USD");
    expect(mockEqTo).toHaveBeenCalledWith("to_currency", "EUR");
  });

  it("returns 1 and logs warning if database returns an error", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: new Error("DB error") });
    const mockEqTo = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEqFrom = vi.fn().mockReturnValue({ eq: mockEqTo });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqFrom });
    (supabase.from as any).mockReturnValue({ select: mockSelect });

    const rate = await getConversionRate("USD", "EUR");
    expect(rate).toBe(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith("Could not find rate from USD to EUR, falling back to 1", expect.any(Error));
    
    consoleWarnSpy.mockRestore();
  });
});
