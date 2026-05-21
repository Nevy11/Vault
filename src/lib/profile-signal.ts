import { useEffect, useState } from "react";

type Profile = {
  first_name?: string;
  last_name?: string;
  email?: string;
  kyc_status?: string;
  phone_number?: string;
  profile_photo_url?: string | null;
} | null;

class ProfileSignal {
  private value: Profile = null;
  private subscribers: Set<(value: Profile) => void> = new Set();

  set(newValue: Profile) {
    this.value = newValue;
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

  return [profile, profileSignal.set.bind(profileSignal)] as const;
}
