import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function formatWithCommas(value: string | number): string {
  const amount = String(value).replace(/[^0-9.]/g, "");
  const parts = amount.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function parseFormattedNumber(value: string): number {
  return Number(value.replace(/,/g, ""));
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export function normalizeKycNamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "")
    .replace(/\.+/g, ".");
}

export function formatKycTag(firstName: string, lastName: string) {
  const normalizedFirst = normalizeKycNamePart(firstName) || "user";
  const normalizedLast = normalizeKycNamePart(lastName) || "customer";
  return `@${normalizedFirst}.${normalizedLast}`;
}

export function getCurrencyForNationality(nationality?: string | null): string {
  const norm = nationality?.trim().toLowerCase() || "";
  if (!norm) return "USD";
  if (norm.includes("kenya") || norm.includes("kenyan")) return "KSH";
  return "USD";
}

export function calculateTransactionFee(amount: number, currency: string): number {
  if (currency === "KSH") {
    // M-Pesa Withdrawal from Agent Rates
    if (amount < 1) return 0;
    if (amount <= 100) return 10;
    if (amount <= 500) return 27;
    if (amount <= 1000) return 28;
    if (amount <= 1500) return 34;
    if (amount <= 2500) return 34;
    if (amount <= 3500) return 49;
    if (amount <= 5000) return 67;
    if (amount <= 7500) return 82;
    if (amount <= 10000) return 110;
    if (amount <= 15000) return 159;
    if (amount <= 20000) return 176;
    if (amount <= 35000) return 187;
    if (amount <= 50000) return 270;
    return 300; // Cap for standard mobile withdrawals
  }

  // USD Tiered Rates
  if (amount <= 0) return 0;
  if (amount <= 10) return 0.5;
  if (amount <= 50) return 1.0;
  if (amount <= 100) return 2.0;
  if (amount <= 500) return 5.0;
  return amount * 0.01; // 1% for larger amounts
}
