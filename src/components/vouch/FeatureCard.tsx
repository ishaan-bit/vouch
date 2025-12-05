"use client";

import { useEffect, useState, ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  delay?: number;
}

export function FeatureCard({ icon, title, description, delay = 0 }: FeatureCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`relative group transition-all duration-700 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-violet-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Card */}
      <div
        className="relative p-6 rounded-3xl backdrop-blur-xl border border-white/10 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, 
            rgba(139, 92, 246, 0.1) 0%, 
            rgba(168, 85, 247, 0.05) 50%, 
            rgba(139, 92, 246, 0.1) 100%)`,
          boxShadow: `
            0 4px 30px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
        }}
      >
        {/* Glossy sheen */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative flex items-start gap-4">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-violet-300"
            style={{
              background: `linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)`,
              boxShadow: `0 0 20px rgba(139, 92, 246, 0.15)`,
            }}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
            <p className="text-sm text-violet-200/70 leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-3xl border border-violet-500/20 pointer-events-none" />
      </div>
    </div>
  );
}
