"use client";

import { BottomNav } from "./bottom-nav";
import { cn } from "@/lib/utils";
import { FloatingParticles } from "@/components/ui/floating-particles";

interface AppShellProps {
  children: React.ReactNode;
  showNav?: boolean;
  showParticles?: boolean;
  className?: string;
}

export function AppShell({ 
  children, 
  showNav = true, 
  showParticles = true,
  className 
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--dusk-1)]">
      {/* Dusk gradient background */}
      <div className="fixed inset-0 bg-gradient-to-b from-[var(--dusk-1)] via-[var(--dusk-2)] to-[var(--dusk-1)] pointer-events-none" />
      
      {/* Ambient glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--accent-violet)]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[var(--accent-magenta)]/8 rounded-full blur-[80px]" />
      </div>
      
      {/* Floating particles */}
      {showParticles && <FloatingParticles />}
      
      <main
        className={cn(
          "relative z-10 mx-auto max-w-lg",
          showNav && "pb-[calc(72px+env(safe-area-inset-bottom))]",
          className
        )}
      >
        {children}
      </main>
      
      {showNav && <BottomNav />}
    </div>
  );
}
