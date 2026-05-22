import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^\.|\.$)/g, '')
    .replace(/\.+/g, '.');
}

export function formatKycTag(firstName: string, lastName: string) {
  const normalizedFirst = normalizeKycNamePart(firstName) || 'user';
  const normalizedLast = normalizeKycNamePart(lastName) || 'customer';
  return `@${normalizedFirst}.${normalizedLast}`;
}

export function getCurrencyForNationality(nationality?: string | null): string {
  const norm = nationality?.trim().toLowerCase() || "";
  if (!norm) return "USD";
  if (norm.includes("kenya") || norm.includes("kenyan")) return "KSH";
  return "USD";
}
