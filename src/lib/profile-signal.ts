import { useEffect, useState, useCallback } from "react";

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
  created_at?: string;
} | null;

const PROFILE_CACHE_KEY = "vault_profile_cache";

class ProfileSignal {
  private value: Profile = null;
  private subscribers: Set<(value: Profile) => void> = new Set();

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
    this.subscribers.forEach((callback) => callback(newValue));
  }

  get() {
    return this.value;
  }

  subscribe(callback: (value: Profile) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}

export const profileSignal = new ProfileSignal();

export function useProfileSignal() {
  const [profile, setProfile] = useState<Profile>(profileSignal.get());

  useEffect(() => {
    const unsubscribe = profileSignal.subscribe((newProfile) => {
      setProfile(newProfile);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const setter = useCallback((newValue: Profile) => {
    profileSignal.set(newValue);
  }, []);

  return [profile, setter] as const;
}
