import React, { useState, useEffect } from "react";
import { MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingAdvisorProps {
  onClick: () => void;
  className?: string;
}

/**
 * FloatingAdvisor - A premium, labeled AI Financial Advisor FAB.
 * Designed as a high-visibility pill capsule that expands on mount to reveal the label.
 */
export function FloatingAdvisor({ onClick, className }: FloatingAdvisorProps) {
  const [showLabel, setShowLabel] = useState(false);

  useEffect(() => {
    // Entrance animation: The label slides in from the right shortly after dashboard mount
    const timer = setTimeout(() => {
      setShowLabel(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-50 group flex items-center bg-[#004D2C] hover:bg-[#00361E] text-white shadow-lg hover:shadow-xl transition-all duration-700 ease-in-out border border-white/10 h-14 rounded-full overflow-hidden",
        showLabel ? "px-6 w-auto" : "w-14 justify-center",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {/* Animated Text Label Container */}
        <div
          className={cn(
            "flex items-center gap-2 transition-all duration-1000 ease-in-out overflow-hidden",
            showLabel
              ? "opacity-100 translate-x-0 max-w-[240px]"
              : "opacity-0 translate-x-12 max-w-0 pointer-events-none",
          )}
        >
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
          <span className="text-sm font-medium tracking-wide whitespace-nowrap">
            Ask Vault AI Advisor
          </span>
        </div>

        {/* Chat Bubble Icon Container */}
        <div className="relative shrink-0 flex items-center justify-center">
          <MessageCircle className="h-6 w-6 md:h-7 md:w-7 group-hover:scale-110 transition-transform duration-300" />

          {/* Subtle Attention-Grabbing Indicator */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border border-white/20"></span>
          </span>
        </div>
      </div>

      {/* Glossy Overlay for Premium Feel */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  );
}
