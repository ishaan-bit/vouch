"use client";

import { cn } from "@/lib/utils";

interface PactRingProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  children?: React.ReactNode;
}

const sizeClasses = {
  sm: "w-24 h-24",
  md: "w-40 h-40",
  lg: "w-56 h-56",
  xl: "w-72 h-72",
};

export function PactRing({ size = "md", className, children }: PactRingProps) {
  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--accent-violet)]/40 to-[var(--accent-magenta)]/20 blur-xl animate-breathe" />
      
      {/* Main ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-radial from-[var(--accent-violet)] via-[var(--accent-violet)]/50 to-transparent opacity-30" />
      
      {/* Rotating border */}
      <div 
        className="absolute inset-2 rounded-full border-2 border-[var(--accent-violet)]/50"
        style={{
          animation: "ring-rotate 20s linear infinite",
          background: "conic-gradient(from 0deg, transparent, var(--accent-lilac), transparent, var(--accent-magenta), transparent)",
          maskImage: "radial-gradient(circle, transparent 60%, black 61%, black 100%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 60%, black 61%, black 100%)",
        }}
      />
      
      {/* Inner rotating ring */}
      <div 
        className="absolute inset-4 rounded-full border border-[var(--accent-lilac)]/30"
        style={{
          animation: "ring-rotate 15s linear infinite reverse",
        }}
      />
      
      {/* Center content area */}
      <div className="absolute inset-6 rounded-full bg-[var(--dusk-1)] flex items-center justify-center shadow-[inset_0_0_30px_rgba(140,91,255,0.2)]">
        {children}
      </div>
      
      {/* Accent dots */}
      <div 
        className="absolute inset-0"
        style={{
          animation: "ring-rotate 25s linear infinite",
        }}
      >
        <div className="absolute top-1 left-1/2 w-2 h-2 -translate-x-1/2 rounded-full bg-[var(--accent-lilac)] shadow-[0_0_10px_var(--accent-lilac)]" />
        <div className="absolute bottom-1 left-1/2 w-1.5 h-1.5 -translate-x-1/2 rounded-full bg-[var(--accent-magenta)] shadow-[0_0_8px_var(--accent-magenta)]" />
      </div>
    </div>
  );
}
