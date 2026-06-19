import { describe, it, expect } from "vitest";
import {
  formatWithCommas,
  parseFormattedNumber,
  calculateTransactionFee,
  formatKycTag,
} from "../utils";

describe("utils", () => {
  describe("formatWithCommas", () => {
    it("formats numbers with commas", () => {
      expect(formatWithCommas(1000)).toBe("1,000");
      expect(formatWithCommas(1234567.89)).toBe("1,234,567.89");
    });

    it("handles string input", () => {
      expect(formatWithCommas("1000")).toBe("1,000");
    });
  });

  describe("parseFormattedNumber", () => {
    it("removes commas and parses to number", () => {
      expect(parseFormattedNumber("1,000")).toBe(1000);
      expect(parseFormattedNumber("1,234,567.89")).toBe(1234567.89);
    });
  });

  describe("calculateTransactionFee", () => {
    it("calculates USD fees correctly", () => {
      expect(calculateTransactionFee(5, "USD")).toBe(0.5);
      expect(calculateTransactionFee(75, "USD")).toBe(2.0);
      expect(calculateTransactionFee(1000, "USD")).toBe(10);
    });

    it("calculates KES fees correctly", () => {
      expect(calculateTransactionFee(50, "KES")).toBe(10);
      expect(calculateTransactionFee(750, "KES")).toBe(28);
      expect(calculateTransactionFee(100000, "KES")).toBe(300);
    });
  });

  describe("formatKycTag", () => {
    it("formats first and last names into a tag", () => {
      expect(formatKycTag("John", "Doe")).toBe("@john.doe");
    });

    it("normalizes names with special characters", () => {
      expect(formatKycTag("Jane-Anne", "O'Connor")).toBe("@jane.anne.o.connor");
    });
  });
});
