import React, { createContext, useContext, useEffect, useState } from "react";
import { useProfile } from "./use-profile";
import { supabase } from "@/api/supabase";

interface TextSizeContextType {
  textSize: string; // e.g. "100" (percentage)
  setTextSize: (size: string) => void;
  updateTextSizeInDb: (size: string) => Promise<void>;
}

const TextSizeContext = createContext<TextSizeContextType | undefined>(undefined);

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSizeState] = useState<string>("100");
  const { profile, refetch } = useProfile();

  // Load from localstorage initially
  useEffect(() => {
    const savedSize = localStorage.getItem("text-size");
    if (savedSize) {
      setTextSizeState(savedSize);
      document.documentElement.style.fontSize = `${savedSize}%`;
    } else {
      document.documentElement.style.fontSize = "100%";
    }
  }, []);

  // Sync from profile when loaded
  useEffect(() => {
    if (profile?.text_size) {
      setTextSizeState(profile.text_size);
      document.documentElement.style.fontSize = `${profile.text_size}%`;
      localStorage.setItem("text-size", profile.text_size);
    }
  }, [profile?.text_size]);

  const setTextSize = (size: string) => {
    setTextSizeState(size);
    document.documentElement.style.fontSize = `${size}%`;
    localStorage.setItem("text-size", size);
  };

  const updateTextSizeInDb = async (size: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_preferences")
        .upsert({ user_id: user.id, text_size: size }, { onConflict: "user_id" });

      if (error) throw error;
      
      // Update local state and profile cache
      setTextSize(size);
      refetch();
    } catch (err) {
      console.error("Failed to save text size preference in database", err);
    }
  };

  return (
    <TextSizeContext.Provider value={{ textSize, setTextSize, updateTextSizeInDb }}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  const context = useContext(TextSizeContext);
  if (context === undefined) {
    throw new Error("useTextSize must be used within a TextSizeProvider");
  }
  return context;
}
