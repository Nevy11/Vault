import { useEffect, useState, useCallback, useSyncExternalStore } from "react";

export type Profile = {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  kyc_status?: string;
  phone_number?: string;
  profile_photo_url?: string | null;
  kyc_tag?: string;
  pin_hash?: string;
  nationality?: string;
  language?: string;
  created_at?: string;
  notifications_transfer_received?: boolean;
  notifications_transfer_sent?: boolean;
  notifications_account_login?: boolean;
  notifications_security_alerts?: boolean;
  notifications_ai_insights?: boolean;
  biometric_enabled?: boolean;
} | null;

const PROFILE_CACHE_KEY = "vault_profile_cache";

class ProfileSignal {
  private value: Profile = null;
  private subscribers: Set<() => void> = new Set();

  constructor() {
    // Initial value is always null for hydration safety
  }

  // Allow manual hydration from outside (e.g. in a useEffect)
  hydrate() {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && !this.value) {
            this.set(parsed);
          }
        } catch (e) {
          console.error("Failed to parse cached profile", e);
        }
      }
    }
  }

  set(newValue: Profile) {
    this.value = newValue;
    if (typeof window !== "undefined") {
      if (newValue) {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(newValue));
      } else {
        localStorage.removeItem(PROFILE_CACHE_KEY);
      }
    }
    this.notify();
  }

  get() {
    return this.value;
  }

  private notify() {
    this.subscribers.forEach((callback) => callback());
  }

  subscribe = (callback: () => void) => {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  };

  getSnapshot = () => {
    return this.value;
  };
}

export const profileSignal = new ProfileSignal();

export function useProfileSignal() {
  const profile = useSyncExternalStore(
    profileSignal.subscribe,
    profileSignal.getSnapshot,
    profileSignal.getSnapshot, // Server snapshot
  );

  const setter = useCallback((newValue: Profile) => {
    profileSignal.set(newValue);
  }, []);

  return [profile, setter] as const;
}
