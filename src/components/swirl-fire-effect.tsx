import React, { useState, useEffect } from "react";

interface Effect {
  id: number;
  x: number;
  y: number;
}

export function SwirlFireEffect() {
  const [effects, setEffects] = useState<Effect[]>([]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const newEffect = {
        id: Date.now(),
        x: e.clientX,
        y: e.clientY,
      };
      setEffects((prev) => [...prev, newEffect]);

      // Remove the effect after the animation completes
      setTimeout(() => {
        setEffects((prev) => prev.filter((eff) => eff.id !== newEffect.id));
      }, 600);
    };

    window.addEventListener("mousedown", handleMouseDown);
    return () => window.removeEventListener("mousedown", handleMouseDown);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {effects.map((eff) => (
        <div
          key={eff.id}
          className="absolute animate-swirl-fire"
          style={{
            left: eff.x - 8,
            top: eff.y - 8,
          }}
        >
          <div className="w-4 h-4 rounded-full bg-orange-500/60 blur-[2px] shadow-[0_0_15px_rgba(255,165,0,0.5)] border border-orange-400/30" />
        </div>
      ))}
    </div>
  );
}
