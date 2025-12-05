"use client";

import { useEffect, useState } from "react";
import { VouchLogo } from "./VouchLogo";

interface FloatingDot {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  orbitRadius: number;
  startAngle: number;
  duration: number;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

export function PactHeroVisual() {
  const [mounted, setMounted] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    setMounted(true);
    // Generate subtle sparkles
    const newSparkles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 3,
    }));
    setSparkles(newSparkles);
  }, []);

  // Abstract floating dots - soft pastel colors only
  const floatingDots: FloatingDot[] = [
    { id: 0, x: 0, y: 0, size: 8, color: "#c4b5fd", orbitRadius: 85, startAngle: 0, duration: 25 },      // lavender
    { id: 1, x: 0, y: 0, size: 6, color: "#fda4af", orbitRadius: 95, startAngle: 72, duration: 30 },     // rose
    { id: 2, x: 0, y: 0, size: 10, color: "#99f6e4", orbitRadius: 75, startAngle: 144, duration: 22 },   // pale teal
    { id: 3, x: 0, y: 0, size: 5, color: "#ddd6fe", orbitRadius: 105, startAngle: 216, duration: 28 },   // lighter lavender
    { id: 4, x: 0, y: 0, size: 7, color: "#fbcfe8", orbitRadius: 80, startAngle: 288, duration: 26 },    // soft pink
  ];

  return (
    <div className="relative w-72 h-72 md:w-80 md:h-80 lg:w-96 lg:h-96">
      {/* Ambient outer glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, 
            rgba(139, 92, 246, 0.12) 0%, 
            rgba(168, 85, 247, 0.06) 50%, 
            transparent 70%
          )`,
          filter: "blur(30px)",
          transform: "scale(1.5)",
        }}
      />

      {/* Soft inner glow circle */}
      <div
        className={`absolute inset-12 md:inset-14 lg:inset-16 rounded-full transition-opacity duration-1500 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background: `radial-gradient(circle at center,
            rgba(139, 92, 246, 0.06) 0%,
            rgba(88, 28, 135, 0.03) 70%,
            transparent 100%
          )`,
          boxShadow: `
            0 0 80px rgba(139, 92, 246, 0.08),
            inset 0 0 40px rgba(139, 92, 246, 0.05)
          `,
        }}
      />

      {/* Very subtle ring */}
      <div
        className={`absolute inset-8 md:inset-10 lg:inset-12 rounded-full border border-violet-500/8 transition-opacity duration-1500 delay-300 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Center VouchLogo (Pact Token) */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 delay-200 ${
          mounted ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
      >
        <VouchLogo size="xl" animate={mounted} />
      </div>

      {/* Abstract floating dots - no emojis, no avatars */}
      {floatingDots.map((dot, index) => (
        <div
          key={dot.id}
          className="absolute pointer-events-none"
          style={{
            left: "50%",
            top: "50%",
            width: dot.size,
            height: dot.size,
            marginLeft: -dot.size / 2,
            marginTop: -dot.size / 2,
            opacity: mounted ? 1 : 0,
            transition: `opacity 1s ease-out ${400 + index * 100}ms`,
            animation: mounted
              ? `float-orbit-${dot.id} ${dot.duration}s linear infinite`
              : "none",
          }}
        >
          {/* Dot glow */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: dot.color,
              boxShadow: `0 0 ${dot.size * 2}px ${dot.color}`,
              filter: "blur(1px)",
              opacity: 0.6,
            }}
          />
          {/* Dot core */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 30% 30%, white 0%, ${dot.color} 70%)`,
              opacity: 0.9,
            }}
          />
        </div>
      ))}

      {/* Tiny drifting sparkles */}
      {mounted && sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size,
            background: "rgba(221, 214, 254, 0.8)",
            boxShadow: "0 0 4px rgba(221, 214, 254, 0.5)",
            animation: `sparkle-drift ${sparkle.duration}s ease-in-out infinite`,
            animationDelay: `${sparkle.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
