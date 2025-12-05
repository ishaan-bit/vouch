"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Coins } from "lucide-react";
import { SettlementList } from "@/components/settlements/settlement-list";
import { cn } from "@/lib/utils";

export default function SettlementsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen pb-20">
      {/* Header with glow */}
      <div className="relative">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[var(--accent-gold)]/20 blur-[60px] rounded-full" />
        
        <div className={cn(
          "sticky top-0 z-50 backdrop-blur-xl border-b border-white/[0.06]",
          "bg-[var(--dusk-1)]/80"
        )}>
          <div className="flex items-center gap-4 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-gold)]/60 flex items-center justify-center">
                <Coins className="h-5 w-5 text-[var(--dusk-1)]" />
              </div>
              <div>
                <h1 className="font-semibold text-white">Settlements</h1>
                <p className="text-sm text-white/40">
                  Manage your payments
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <SettlementList />
      </div>
    </div>
  );
}
