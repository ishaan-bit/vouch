"use client";

import { useEffect, useState } from "react";

interface FloatingTokenProps {
  index: number;
  total: number;
  emoji?: string;
  color?: string;
  delay?: number;
}

export function FloatingToken({
  index,
  total,
  emoji = "👤",
  color = "from-violet-400 to-fuchsia-500",
  delay = 0,
}: FloatingTokenProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Calculate position around the orb
  const angle = (index / total) * 360;
  const radius = 90; // Distance from center

  return (
    <div
      className={`absolute w-12 h-12 md:w-14 md:h-14 transition-all duration-1000 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
      style={{
        left: "50%",
        top: "50%",
        transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${radius}px) rotate(-${angle}deg)`,
      }}
    >
      {/* Token glow */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${color} blur-lg opacity-50 animate-pulse`}
      />

      {/* Token body */}
      <div
        className={`relative w-full h-full rounded-full bg-gradient-to-br ${color} shadow-lg flex items-center justify-center border-2 border-white/20`}
        style={{
          boxShadow: `
            0 0 20px rgba(168, 85, 247, 0.3),
            inset 0 -4px 10px rgba(0, 0, 0, 0.2),
            inset 0 4px 10px rgba(255, 255, 255, 0.1)
          `,
        }}
      >
        <span className="text-lg md:text-xl">{emoji}</span>
      </div>
    </div>
  );
}