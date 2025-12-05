"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface VouchLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  animate?: boolean;
  className?: string;
}

export function VouchLogo({ size = "md", animate = true, className = "" }: VouchLogoProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-24 h-24",
    xl: "w-32 h-32",
  };

  const iconSizes = {
    sm: 20,
    md: 32,
    lg: 48,
    xl: 64,
  };

  return (
    <div
      className={cn(
        "relative",
        sizeClasses[size],
        animate && mounted && "animate-pulse",
        className
      )}
    >
      {/* Outer glow */}
      <div
        className="absolute -inset-2 rounded-full opacity-60"
        style={{
          background: `radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(139, 92, 246, 0.2) 50%, transparent 70%)`,
          filter: "blur(8px)",
        }}
      />

      {/* Token body */}
      <div
        className="relative w-full h-full rounded-full"
        style={{
          background: `
            linear-gradient(135deg, 
              #a855f7 0%, 
              #8b5cf6 30%, 
              #7c3aed 60%, 
              #6d28d9 100%
            )
          `,
          boxShadow: `
            0 4px 20px rgba(139, 92, 246, 0.5),
            0 0 40px rgba(168, 85, 247, 0.3),
            inset 0 2px 4px rgba(255, 255, 255, 0.2),
            inset 0 -2px 4px rgba(0, 0, 0, 0.2)
          `,
        }}
      >
        {/* Inner highlight ring */}
        <div
          className="absolute inset-1 rounded-full border border-white/20"
          style={{
            background: `linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 50%)`,
          }}
        />

        {/* Pinky Promise Icon - SVG */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            width={iconSizes[size]}
            height={iconSizes[size]}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
            {/* Stylized V logo */}
            <g opacity="0.95">
              {/* Main V shape with elegant stroke */}
              <path
                d="M16 16L32 48L48 16"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              {/* Inner highlight line */}
              <path
                d="M20 20L32 44L44 20"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>
          </svg>
        </div>

        {/* Shine highlight */}
        <div className="absolute top-1 left-2 w-1/4 h-1/4 rounded-full bg-white/30 blur-[2px]" />
      </div>

      {/* Sparkle accents */}
      {mounted && animate && (
        <>
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-violet-200 rounded-full animate-ping" />
          <div 
            className="absolute -bottom-1 left-0 w-1.5 h-1.5 bg-fuchsia-200 rounded-full animate-ping"
            style={{ animationDelay: "0.7s" }}
          />
        </>
      )}
    </div>
  );
}
