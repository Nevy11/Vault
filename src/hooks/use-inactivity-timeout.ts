import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/api/supabase";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes in milliseconds

export function useInactivityTimeout(isLoggedIn: boolean) {
  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
    toast.info("You have been logged out due to inactivity.");
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (isLoggedIn) {
      timeoutRef.current = setTimeout(handleLogout, INACTIVITY_LIMIT);
    }
  }, [handleLogout, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const eventHandler = () => resetTimer();

    // Set initial timer
    resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, eventHandler);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, eventHandler);
      });
    };
  }, [isLoggedIn, resetTimer]);
}
