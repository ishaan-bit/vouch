"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  VOUCH_RULES_TITLE,
  VOUCH_RULES,
  VOUCH_RULES_ACCEPT_BUTTON,
  VOUCH_RULES_CLOSE_BUTTON,
} from "@/lib/vouch-rules";

interface VouchRulesScreenProps {
  isFirstTime?: boolean;
  onClose?: () => void;
}

export function VouchRulesScreen({ isFirstTime = false, onClose }: VouchRulesScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAccepting, setIsAccepting] = useState(false);

  const acceptRulesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile/accept-rules", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept rules");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      if (isFirstTime) {
        router.push("/home");
      } else {
        onClose?.();
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setIsAccepting(false);
    },
  });

  const handleAccept = () => {
    setIsAccepting(true);
    acceptRulesMutation.mutate();
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950/30">
      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Close button (only when not first time) */}
      {!isFirstTime && (
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
      )}

      {/* Parchment container */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
        {/* Parchment background */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-amber-50 via-orange-50/95 to-amber-100"
          style={{
            boxShadow: "inset 0 0 60px rgba(139, 69, 19, 0.15), inset 0 0 20px rgba(139, 69, 19, 0.1)",
          }}
        />
        
        {/* Aged edges effect */}
        <div className="absolute inset-0 rounded-2xl border border-amber-900/10" />
        <div 
          className="absolute inset-0 rounded-2xl"
          style={{
            background: "radial-gradient(ellipse at center, transparent 60%, rgba(139, 69, 19, 0.08) 100%)",
          }}
        />

        {/* Scrollable content */}
        <div className="relative overflow-y-auto max-h-[90vh] p-6 sm:p-8">
          {/* Subtle emblem at top */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-900/20 to-amber-900/20 flex items-center justify-center border border-amber-900/20">
              <span className="text-2xl font-serif text-amber-900/70">V</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-center text-xl sm:text-2xl font-bold tracking-wide text-amber-950 mb-8">
            {VOUCH_RULES_TITLE}
          </h1>

          {/* Rules list */}
          <ol className="space-y-4 mb-8">
            {VOUCH_RULES.map((rule, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-900/10 flex items-center justify-center text-sm font-semibold text-amber-900/70">
                  {index + 1}
                </span>
                <p className="text-amber-950/90 leading-relaxed italic text-sm sm:text-base">
                  {rule}
                </p>
              </li>
            ))}
          </ol>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />
            <div className="w-2 h-2 rounded-full bg-amber-900/20" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-900/20 to-transparent" />
          </div>

          {/* Accept button */}
          <Button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full py-6 text-base font-semibold bg-gradient-to-r from-red-900 to-amber-900 hover:from-red-800 hover:to-amber-800 text-amber-50 border-0 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isAccepting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Accepting...
              </>
            ) : (
              VOUCH_RULES_ACCEPT_BUTTON
            )}
          </Button>

          {/* Close link (only when not first time) */}
          {!isFirstTime && (
            <button
              onClick={handleClose}
              className="w-full mt-4 text-center text-sm text-amber-900/60 hover:text-amber-900 transition-colors"
            >
              {VOUCH_RULES_CLOSE_BUTTON}
            </button>
          )}

          {/* Bottom emblem */}
          <div className="flex justify-center mt-6">
            <div className="text-amber-900/30 text-xs tracking-widest uppercase">
              Vouch Club
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
