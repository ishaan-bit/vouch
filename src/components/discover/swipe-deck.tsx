"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
} from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Users,
  Clock,
  Coins,
  X,
  Heart,
  Undo2,
  Sparkles,
  CheckCircle,
  Loader2,
  ArrowRight,
  Send,
  AlertCircle,
} from "lucide-react";

// Types
export interface DiscoverPact {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationDays: number;
  status: string;
  createdAt: string;
  creator: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  members?: Array<{
    id: string;
    name: string | null;
    avatarUrl: string | null;
  }>;
  memberCount: number;
  rules?: Array<{
    id: string;
    title: string;
    stakeAmount: number;
    creator: {
      id: string;
      name: string | null;
      avatarUrl: string | null;
    };
  }>;
  rulesCount: number;
  stakes?: {
    minStakeAmount: number | null;
    maxStakeAmount: number | null;
  };
  isMember?: boolean;
}

interface SwipeDeckProps {
  pacts: DiscoverPact[];
  onEmpty?: () => void;
}

interface SwipeState {
  x: number;
  y: number;
  rotation: number;
}

const SWIPE_THRESHOLD = 100;
const ROTATION_FACTOR = 0.1;

// Swipe Card Component
function SwipeCard({
  pact,
  isTop,
  style,
  onSwipeLeft,
  onSwipeRight,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  pact: DiscoverPact;
  isTop: boolean;
  style: React.CSSProperties;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onDragStart: () => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isTop) return;
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    onDragStart();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !isTop) return;
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    onDragMove(deltaX, deltaY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || !isTop) return;
    setIsDragging(false);
    onDragEnd();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const formatStake = (amountPaise: number | null | undefined) => {
    if (!amountPaise) return "No stake";
    return `₹${(amountPaise / 100).toFixed(0)}`;
  };

  // Defensive: ensure members is an array
  const members = pact.members ?? [];
  const rules = pact.rules ?? [];
  const stakes = pact.stakes ?? { minStakeAmount: null, maxStakeAmount: null };

  const durationLabel = `${pact.durationDays} day${pact.durationDays !== 1 ? "s" : ""}`;

  return (
    <div
      ref={cardRef}
      className={cn(
        "absolute inset-0 rounded-3xl overflow-hidden touch-none select-none",
        "bg-[var(--dusk-2)] border border-white/10",
        isTop && "cursor-grab active:cursor-grabbing"
      )}
      style={{
        ...style,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139, 92, 246, 0.1)",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Gradient Header */}
      <div className="relative h-40 bg-gradient-to-br from-[var(--accent-violet)] via-[var(--accent-magenta)] to-[var(--accent-pink)]">
        {/* Shimmer effect */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
            animation: "shimmer 2s infinite",
          }}
        />

        {/* Duration badge */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-full text-sm font-medium text-white flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {durationLabel}
          </span>
        </div>

        {/* Stakes badge */}
        <div className="absolute top-4 right-4">
          <span className="px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-full text-sm font-medium text-[var(--accent-gold)] flex items-center gap-2">
            <Coins className="w-4 h-4" />
            {stakes.minStakeAmount ? (
              <>
                Stake: {formatStake(stakes.minStakeAmount)}
                {stakes.maxStakeAmount && stakes.maxStakeAmount !== stakes.minStakeAmount && (
                  <span>- {formatStake(stakes.maxStakeAmount)}</span>
                )}
              </>
            ) : (
              "No stake"
            )}
          </span>
        </div>

        {/* Central icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 flex flex-col h-[calc(100%-10rem)]">
        {/* Pact Name */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">{pact.name}</h2>

        {/* Creator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Avatar className="w-6 h-6 border border-white/20">
            <AvatarImage src={pact.creator.avatarUrl || undefined} />
            <AvatarFallback className="text-xs bg-[var(--dusk-3)] text-white/70">
              {pact.creator.name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-white/50">by {pact.creator.name || "Anonymous"}</span>
        </div>

        {/* Description */}
        {pact.description && (
          <p className="text-white/60 text-center mb-6 line-clamp-3 flex-shrink-0">
            {pact.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="flex items-center gap-2 text-white/60">
            <Users className="w-5 h-5" />
            <span className="text-lg font-medium">{pact.memberCount}</span>
            <span className="text-sm">members</span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2 text-white/60">
            <span className="text-lg font-medium">{pact.rulesCount}</span>
            <span className="text-sm">rules</span>
          </div>
        </div>

        {/* Member Avatars */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((member, i) => (
              <Avatar key={member.id || i} className="w-10 h-10 border-2 border-[var(--dusk-2)]">
                <AvatarImage src={member.avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white text-sm">
                  {member.name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
            ))}
            {pact.memberCount > 5 && (
              <div className="w-10 h-10 rounded-full bg-[var(--dusk-3)] border-2 border-[var(--dusk-2)] flex items-center justify-center text-sm text-white/60">
                +{pact.memberCount - 5}
              </div>
            )}
          </div>
        </div>

        {/* Existing Rules Preview */}
        {rules.length > 0 && (
          <div className="flex-1 overflow-y-auto mb-4">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Current Rules</p>
            <div className="space-y-2">
              {rules.slice(0, 3).map((rule) => (
                <div key={rule.id} className="p-3 rounded-xl bg-[var(--dusk-3)]/60 border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/80 truncate flex-1">{rule.title}</span>
                    <span className="text-sm font-medium text-[var(--accent-gold)] ml-2">
                      {formatStake(rule.stakeAmount)}
                    </span>
                  </div>
                </div>
              ))}
              {rules.length > 3 && (
                <p className="text-xs text-white/30 text-center">+{rules.length - 3} more</p>
              )}
            </div>
          </div>
        )}

        {/* Swipe hint */}
        <div className="text-center text-xs text-white/30 mt-auto pt-4 border-t border-white/5">
          Swipe right to join • Left to skip
        </div>
      </div>

      {/* Swipe indicators */}
      {isTop && (
        <>
          {/* Like indicator */}
          <div
            className="absolute top-6 right-6 px-4 py-2 rounded-xl border-2 border-[var(--accent-teal)] text-[var(--accent-teal)] font-bold text-xl rotate-12 opacity-0 transition-opacity"
            style={{ opacity: style.transform?.toString().includes("translateX") ? Math.min(Math.abs(parseFloat(style.transform?.toString().match(/translateX\((-?\d+)px\)/)?.[1] || "0")) / SWIPE_THRESHOLD, 1) * (parseFloat(style.transform?.toString().match(/translateX\((-?\d+)px\)/)?.[1] || "0") > 0 ? 1 : 0) : 0 }}
          >
            JOIN
          </div>
          {/* Nope indicator */}
          <div
            className="absolute top-6 left-6 px-4 py-2 rounded-xl border-2 border-[var(--accent-magenta)] text-[var(--accent-magenta)] font-bold text-xl -rotate-12 opacity-0 transition-opacity"
            style={{ opacity: style.transform?.toString().includes("translateX") ? Math.min(Math.abs(parseFloat(style.transform?.toString().match(/translateX\((-?\d+)px\)/)?.[1] || "0")) / SWIPE_THRESHOLD, 1) * (parseFloat(style.transform?.toString().match(/translateX\((-?\d+)px\)/)?.[1] || "0") < 0 ? 1 : 0) : 0 }}
          >
            SKIP
          </div>
        </>
      )}
    </div>
  );
}

// Join Rule Modal
function JoinModal({
  open,
  onOpenChange,
  pact,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pact: DiscoverPact | null;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!pact) throw new Error("No pact selected");
      const res = await fetch(`/api/groups/${pact.id}/join-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          stakeAmount: parseFloat(stakeAmount),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit join request");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Your rule has been submitted! Waiting for approval.");
      queryClient.invalidateQueries({ queryKey: ["discover-pacts"] });
      setTitle("");
      setDescription("");
      setStakeAmount("");
      onOpenChange(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !stakeAmount) {
      toast.error("Please fill all fields");
      return;
    }
    joinMutation.mutate();
  };

  const formatStake = (amountPaise: number | null | undefined) => {
    if (!amountPaise) return "No stake";
    return `₹${(amountPaise / 100).toFixed(0)}`;
  };

  if (!pact) return null;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-[var(--accent-magenta)]" />
            Join {pact.name}
          </BottomSheetTitle>
          <BottomSheetDescription>
            Pitch your rule to join this pact. The creator will review and approve it.
          </BottomSheetDescription>
        </BottomSheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Pact Info */}
          <div className="p-4 rounded-xl bg-[var(--dusk-2)] border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white truncate">{pact.name}</h3>
                <p className="text-sm text-white/40">
                  {pact.memberCount} members • Stakes: {formatStake(pact.stakes?.minStakeAmount)}
                  {pact.stakes?.maxStakeAmount && pact.stakes.maxStakeAmount !== pact.stakes.minStakeAmount && ` - ${formatStake(pact.stakes.maxStakeAmount)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Rule Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white/90 font-medium">
              Your Rule Title
            </Label>
            <Input
              id="title"
              placeholder="e.g., Wake up at 6 AM"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[var(--dusk-2)] border-white/10 text-white placeholder:text-white/40 focus:border-[var(--accent-violet)]"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/90 font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Explain your rule and how to verify it..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-[var(--dusk-2)] border-white/10 text-white placeholder:text-white/40 focus:border-[var(--accent-violet)] resize-none"
            />
          </div>

          {/* Stake Amount */}
          <div className="space-y-2">
            <Label htmlFor="stake" className="text-white/90 font-medium">
              Stake Amount (₹)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--accent-gold)]">₹</span>
              <Input
                id="stake"
                type="number"
                min="10"
                step="10"
                placeholder="100"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="pl-8 bg-[var(--dusk-2)] border-white/10 text-white placeholder:text-white/40 focus:border-[var(--accent-violet)]"
              />
            </div>
            <p className="text-xs text-white/50">
              This is what you'll pay if you fail your rule.
            </p>
          </div>

          {/* Preset Stakes */}
          <div className="flex gap-2">
            {[50, 100, 200, 500].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setStakeAmount(amount.toString())}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                  stakeAmount === amount.toString()
                    ? "bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30"
                    : "bg-[var(--dusk-3)] text-white/50 hover:bg-[var(--dusk-3)]/80 border border-white/5"
                )}
              >
                ₹{amount}
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={joinMutation.isPending || !title || !description || !stakeAmount}
            className={cn(
              "w-full py-6 rounded-xl font-semibold text-white min-h-[52px]",
              "bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)]",
              "hover:opacity-90 transition-opacity active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {joinMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Join Request
              </>
            )}
          </Button>
        </form>
      </BottomSheetContent>
    </BottomSheet>
  );
}

// Main Swipe Deck Component
export function SwipeDeck({ pacts, onEmpty }: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeState, setSwipeState] = useState<SwipeState>({ x: 0, y: 0, rotation: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<DiscoverPact[]>([]);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedPact, setSelectedPact] = useState<DiscoverPact | null>(null);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);

  const visiblePacts = pacts.slice(currentIndex, currentIndex + 3);
  const currentPact = pacts[currentIndex];

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragMove = (x: number, y: number) => {
    setSwipeState({
      x,
      y: y * 0.3, // Reduce vertical movement
      rotation: x * ROTATION_FACTOR,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    
    if (Math.abs(swipeState.x) > SWIPE_THRESHOLD) {
      if (swipeState.x > 0) {
        handleSwipeRight();
      } else {
        handleSwipeLeft();
      }
    } else {
      // Snap back
      setSwipeState({ x: 0, y: 0, rotation: 0 });
    }
  };

  const handleSwipeLeft = useCallback(() => {
    if (!currentPact) return;
    setExitDirection("left");
    setSwipeState({ x: -500, y: 0, rotation: -30 });
    
    setTimeout(() => {
      setHistory((prev) => [...prev, currentPact]);
      setCurrentIndex((prev) => prev + 1);
      setSwipeState({ x: 0, y: 0, rotation: 0 });
      setExitDirection(null);
    }, 200);
  }, [currentPact]);

  const handleSwipeRight = useCallback(() => {
    if (!currentPact) return;
    setSelectedPact(currentPact);
    setJoinModalOpen(true);
    setSwipeState({ x: 0, y: 0, rotation: 0 });
  }, [currentPact]);

  const handleJoinSuccess = () => {
    // Move to next card after successful join request
    if (currentPact) {
      setHistory((prev) => [...prev, currentPact]);
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    setCurrentIndex((prev) => prev - 1);
    setHistory((prev) => prev.slice(0, -1));
  };

  // Check if deck is empty
  useEffect(() => {
    if (currentIndex >= pacts.length && onEmpty) {
      onEmpty();
    }
  }, [currentIndex, pacts.length, onEmpty]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (joinModalOpen) return;
      if (e.key === "ArrowLeft") handleSwipeLeft();
      if (e.key === "ArrowRight") handleSwipeRight();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSwipeLeft, handleSwipeRight, joinModalOpen]);

  if (visiblePacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-24 h-24 rounded-full bg-[var(--dusk-2)] flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-[var(--accent-teal)]" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">All caught up!</h3>
        <p className="text-white/40 text-center max-w-xs mb-6">
          No more pacts recruiting right now. Check back later or create your own.
        </p>
        <Button
          onClick={() => window.location.href = "/groups/create"}
          className="bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white px-6 py-3 rounded-xl font-semibold"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Create a Pact
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Card Stack */}
      <div className="relative h-[520px] w-full max-w-sm mx-auto mb-8">
        {visiblePacts.map((pact, index) => {
          const isTop = index === 0;
          const offset = index * 8;
          const scale = 1 - index * 0.05;
          const opacity = 1 - index * 0.2;

          const cardStyle: React.CSSProperties = isTop
            ? {
                transform: `translateX(${swipeState.x}px) translateY(${swipeState.y}px) rotate(${swipeState.rotation}deg)`,
                transition: isDragging ? "none" : "transform 0.3s ease-out",
                zIndex: 3 - index,
              }
            : {
                transform: `translateY(${offset}px) scale(${scale})`,
                opacity,
                zIndex: 3 - index,
                pointerEvents: "none" as const,
              };

          return (
            <SwipeCard
              key={pact.id}
              pact={pact}
              isTop={isTop}
              style={cardStyle}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
            />
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-6">
        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            "bg-[var(--dusk-3)] border border-white/10",
            history.length === 0
              ? "opacity-30 cursor-not-allowed"
              : "hover:bg-[var(--dusk-3)]/80 hover:scale-105"
          )}
        >
          <Undo2 className="w-5 h-5 text-white/60" />
        </button>

        {/* Skip */}
        <button
          onClick={handleSwipeLeft}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all",
            "bg-[var(--dusk-2)] border-2 border-[var(--accent-magenta)]/30",
            "hover:border-[var(--accent-magenta)] hover:scale-105",
            "shadow-lg shadow-[var(--accent-magenta)]/10"
          )}
        >
          <X className="w-8 h-8 text-[var(--accent-magenta)]" />
        </button>

        {/* Join */}
        <button
          onClick={handleSwipeRight}
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-all",
            "bg-gradient-to-br from-[var(--accent-teal)] to-[var(--accent-violet)]",
            "hover:scale-105",
            "shadow-lg shadow-[var(--accent-teal)]/30"
          )}
        >
          <Heart className="w-8 h-8 text-white" />
        </button>

        {/* View Details */}
        <button
          onClick={() => window.location.href = `/groups/${currentPact?.id}`}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
            "bg-[var(--dusk-3)] border border-white/10",
            "hover:bg-[var(--dusk-3)]/80 hover:scale-105"
          )}
        >
          <ArrowRight className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Progress */}
      <div className="mt-6 text-center">
        <p className="text-sm text-white/40">
          {currentIndex + 1} of {pacts.length} pacts
        </p>
      </div>

      {/* Join Modal */}
      <JoinModal
        open={joinModalOpen}
        onOpenChange={setJoinModalOpen}
        pact={selectedPact}
        onSuccess={handleJoinSuccess}
      />
    </div>
  );
}
