import { describe, it, expect, vi } from "vitest";
import { checkVelocity, checkValueSpike, evaluateTransaction } from "../fraud-protection";
import { supabase } from "@/api/supabase";

vi.mock("@/api/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            then: vi.fn((cb) => cb({ count: 0, error: null })),
          })),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              then: vi.fn((cb) => cb({ data: [], error: null })),
            })),
          })),
        })),
      })),
    })),
  },
}));

describe("fraud-protection", () => {
  describe("checkVelocity", () => {
    it("should return isFraudulent false when transaction count is within limits", async () => {
      (supabase.from as any).mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => Promise.resolve({ count: 0, error: null })),
          })),
        })),
      }));

      const result = await checkVelocity("user-123");
      expect(result.isFraudulent).toBe(false);
    });

    it("should flag as fraudulent when transaction count exceeds limits", async () => {
      (supabase.from as any).mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => Promise.resolve({ count: 4, error: null })),
          })),
        })),
      }));

      const result = await checkVelocity("user-123");
      expect(result.isFraudulent).toBe(true);
      expect(result.errorCode).toBe("ERR_FRAUD_VELOCITY");
    });
  });

  describe("checkValueSpike", () => {
    it("should return isFraudulent false when amount is within normal range", async () => {
      (supabase.from as any).mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve({
                  data: [{ amount: 100 }, { amount: 110 }, { amount: 90 }],
                  error: null,
                }),
              ),
            })),
          })),
        })),
      }));

      const result = await checkValueSpike("user-123", 150);
      expect(result.isFraudulent).toBe(false);
    });

    it("should flag as fraudulent when amount is a massive spike", async () => {
      (supabase.from as any).mockImplementationOnce(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve({
                  data: [{ amount: 100 }, { amount: 100 }, { amount: 100 }],
                  error: null,
                }),
              ),
            })),
          })),
        })),
      }));

      const result = await checkValueSpike("user-123", 500); // > 400%
      expect(result.isFraudulent).toBe(true);
      expect(result.errorCode).toBe("ERR_FRAUD_SPIKE");
    });
  });
});
