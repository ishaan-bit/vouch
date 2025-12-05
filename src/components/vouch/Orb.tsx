"use client";

import { useEffect, useState } from "react";

export function Orb() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-32 h-32 md:w-40 md:h-40">
      {/* Outer glow rings */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/20 via-orange-500/10 to-transparent blur-2xl transition-all duration-1000 ${
          mounted ? "scale-150 opacity-100" : "scale-100 opacity-0"
        }`}
        style={{ animation: "pulse-glow 4s ease-in-out infinite" }}
      />
      <div
        className={`absolute inset-2 rounded-full bg-gradient-to-br from-amber-300/30 via-yellow-500/20 to-transparent blur-xl transition-all duration-1000 delay-200 ${
          mounted ? "scale-125 opacity-100" : "scale-100 opacity-0"
        }`}
        style={{ animation: "pulse-glow 4s ease-in-out infinite 0.5s" }}
      />

      {/* Main orb body */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 shadow-2xl transition-all duration-700 ${
          mounted ? "opacity-100 scale-100" : "opacity-0 scale-75"
        }`}
        style={{
          animation: "float 6s ease-in-out infinite",
          boxShadow: `
            0 0 60px rgba(251, 191, 36, 0.4),
            0 0 100px rgba(251, 191, 36, 0.2),
            inset 0 -10px 30px rgba(0, 0, 0, 0.3),
            inset 0 10px 30px rgba(255, 255, 255, 0.2)
          `,
        }}
      >
        {/* Rupee symbol */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-4xl md:text-5xl font-bold text-white/90 drop-shadow-lg"
            style={{
              textShadow: "0 2px 10px rgba(0,0,0,0.3), 0 0 40px rgba(255,255,255,0.3)",
            }}
          >
            ₹
          </span>
        </div>

        {/* Shine highlight */}
        <div
          className="absolute top-3 left-4 w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-white/60 to-transparent blur-sm"
          style={{ animation: "shimmer 3s ease-in-out infinite" }}
        />

        {/* Secondary shine */}
        <div className="absolute top-6 left-8 w-3 h-3 rounded-full bg-white/40 blur-[2px]" />
      </div>

      {/* Sparkle particles */}
      {mounted && (
        <>
          <div
            className="absolute -top-2 -right-2 w-2 h-2 bg-amber-200 rounded-full"
            style={{ animation: "sparkle 2s ease-in-out infinite" }}
          />
          <div
            className="absolute -bottom-1 -left-3 w-1.5 h-1.5 bg-yellow-200 rounded-full"
            style={{ animation: "sparkle 2s ease-in-out infinite 0.5s" }}
          />
          <div
            className="absolute top-1/2 -right-4 w-1 h-1 bg-orange-200 rounded-full"
            style={{ animation: "sparkle 2s ease-in-out infinite 1s" }}
          />
        </>
      )}
    </div>
  );
}
