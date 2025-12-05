"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetFooter,
} from "@/components/ui/bottom-sheet";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  Calendar,
  Clock,
  IndianRupee,
  Loader2,
  UserPlus,
  CheckCircle2,
  XCircle,
  Sparkles,
  Shield,
  Coins,
  Zap,
} from "lucide-react";
import { PactRing } from "@/components/ui/pact-ring";
import { cn } from "@/lib/utils";

interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  status: string;
  durationDays: number;
  startDate: Date | string | null;
  creator: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  memberCount: number;
  rules: {
    id: string;
    title: string;
    description: string;
    stakeAmount: number;
    creatorName: string | null;
  }[];
}

interface ExistingRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface GroupNonMemberViewProps {
  group: GroupInfo;
  currentUserId: string;
  canJoin: boolean;
  existingRequest?: ExistingRequest | null;
}

export function GroupNonMemberView({
  group,
  currentUserId,
  canJoin,
  existingRequest,
}: GroupNonMemberViewProps) {
  const router = useRouter();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [ruleTitle, setRuleTitle] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");

  // Calculate stake range from existing rules
  const stakes = group.rules.map((r) => r.stakeAmount);
  const minStake = stakes.length > 0 ? Math.min(...stakes) : 0;
  const maxStake = stakes.length > 0 ? Math.max(...stakes) : 0;
  const totalStake = stakes.reduce((sum, s) => sum + s, 0);

  const formatAmount = (paise: number) => {
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  };

  // Join request mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${group.id}/join-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ruleTitle,
          description: ruleDescription,
          stakeAmount: parseFloat(stakeAmount), // API will convert to paise
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit join request");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Join request submitted! The creator will review it.");
      setJoinDialogOpen(false);
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmitJoin = () => {
    if (!ruleTitle.trim()) {
      toast.error("Please enter a rule title");
      return;
    }
    if (!ruleDescription.trim()) {
      toast.error("Please enter a rule description");
      return;
    }
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount < 1) {
      toast.error("Please enter a valid stake amount (min ₹1)");
      return;
    }
    joinMutation.mutate();
  };

  const getStatusConfig = () => {
    switch (group.status) {
      case "PLANNING":
        return {
          label: "Recruiting",
          bgClass: "bg-[var(--accent-gold)]/15",
          textClass: "text-[var(--accent-gold)]",
          borderClass: "border-[var(--accent-gold)]/30",
          icon: Sparkles,
        };
      case "ACTIVE":
        return {
          label: "Active",
          bgClass: "bg-[var(--accent-teal)]/15",
          textClass: "text-[var(--accent-teal)]",
          borderClass: "border-[var(--accent-teal)]/30",
          icon: Zap,
        };
      case "COMPLETED":
        return {
          label: "Completed",
          bgClass: "bg-white/10",
          textClass: "text-white/60",
          borderClass: "border-white/10",
          icon: CheckCircle2,
        };
      default:
        return {
          label: group.status,
          bgClass: "bg-white/10",
          textClass: "text-white/60",
          borderClass: "border-white/10",
          icon: Shield,
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="min-h-screen">
      {/* Cinematic Hero Header with Pact Ring */}
      <div className="relative h-80 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-violet)]/30 via-[var(--dusk-2)] to-transparent" />
        
        {/* Animated ambient glow */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[var(--accent-violet)]/20 rounded-full blur-[100px] animate-breathe" />
          <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-[var(--accent-magenta)]/10 rounded-full blur-[80px] animate-float" />
        </div>
        
        {/* Back button */}
        <Link
          href="/discover"
          className="absolute top-4 left-4 z-20 p-2.5 rounded-xl bg-black/30 backdrop-blur-md border border-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        
        {/* Status badge */}
        <div className="absolute top-4 right-4 z-20">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border",
            statusConfig.bgClass,
            statusConfig.textClass,
            statusConfig.borderClass
          )}>
            <statusConfig.icon className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{statusConfig.label}</span>
          </div>
        </div>
        
        {/* Centered Pact Ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <PactRing size="lg">
            <div className="text-center">
              <Sparkles className="w-8 h-8 text-[var(--accent-lilac)] mx-auto mb-1" />
              <span className="text-white/60 text-xs uppercase tracking-wider">Pact</span>
            </div>
          </PactRing>
        </div>
      </div>

      {/* Content */}
      <main className="relative z-10 -mt-20 mx-auto max-w-lg px-4 pb-8">
        {/* Main Info Card */}
        <div className="qd-card p-6 mb-6">
          <h1 className="text-2xl font-bold text-white text-center mb-2">{group.name}</h1>
          
          {group.description && (
            <p className="text-white/50 text-center mb-6 leading-relaxed">{group.description}</p>
          )}
          
          {/* Creator info */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <Avatar className="w-10 h-10 border-2 border-[var(--accent-violet)]/30">
              <AvatarImage src={group.creator.avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white">
                {group.creator.name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">Created by</p>
              <p className="font-medium text-white">{group.creator.name}</p>
            </div>
          </div>
          
          {/* Stats Grid - Game-style cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* Duration */}
            <div className="relative rounded-2xl bg-[var(--dusk-3)]/60 p-4 text-center border border-white/[0.06] overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-lilac)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Calendar className="w-5 h-5 text-[var(--accent-lilac)] mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{group.durationDays}</div>
              <div className="text-xs text-white/40 uppercase tracking-wider">Days</div>
            </div>
            
            {/* Members */}
            <div className="relative rounded-2xl bg-[var(--dusk-3)]/60 p-4 text-center border border-white/[0.06] overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-teal)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Users className="w-5 h-5 text-[var(--accent-teal)] mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{group.memberCount}</div>
              <div className="text-xs text-white/40 uppercase tracking-wider">Members</div>
            </div>
            
            {/* Total Stake */}
            <div className="relative rounded-2xl bg-gradient-to-b from-[var(--accent-gold)]/15 to-[var(--accent-gold)]/5 p-4 text-center border border-[var(--accent-gold)]/20 overflow-hidden">
              <Coins className="w-5 h-5 text-[var(--accent-gold)] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[var(--accent-gold)]">
                {formatAmount(totalStake)}
              </div>
              <div className="text-xs text-[var(--accent-gold)]/60 uppercase tracking-wider">At Stake</div>
            </div>
          </div>
        </div>

        {/* Rules Section */}
        {group.rules.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4 px-1">
              <Shield className="w-4 h-4 text-[var(--accent-lilac)]" />
              <h2 className="font-semibold text-white">Rules</h2>
              <span className="text-white/40 text-sm">({group.rules.length})</span>
            </div>
            
            <div className="space-y-3">
              {group.rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className={cn(
                    "relative rounded-2xl p-4 border transition-all duration-300",
                    "bg-[var(--dusk-2)]/60 backdrop-blur-md border-white/[0.06]",
                    "hover:bg-[var(--dusk-2)]/80 hover:border-white/[0.1]"
                  )}
                >
                  {/* Rule number indicator */}
                  <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    {index + 1}
                  </div>
                  
                  <div className="flex items-start justify-between ml-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white mb-1">{rule.title}</h3>
                      <p className="text-sm text-white/40 line-clamp-2 mb-2">
                        {rule.description}
                      </p>
                      <p className="text-xs text-white/30">by {rule.creatorName}</p>
                    </div>
                    
                    <div className="ml-4 px-3 py-1.5 rounded-lg bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/20">
                      <span className="text-sm font-semibold text-[var(--accent-gold)]">
                        {formatAmount(rule.stakeAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join Section - Premium CTA */}
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-6",
          "bg-gradient-to-br from-[var(--accent-violet)]/20 via-[var(--dusk-2)] to-[var(--accent-magenta)]/10",
          "border border-[var(--accent-violet)]/30"
        )}>
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-violet)]/20 rounded-full blur-[50px]" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[var(--accent-magenta)]/15 rounded-full blur-[40px]" />
          
          <div className="relative z-10">
            {existingRequest ? (
              <div className="text-center py-4">
                {existingRequest.status === "PENDING" ? (
                  <>
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30 flex items-center justify-center animate-glow-pulse">
                      <Clock className="h-7 w-7 text-[var(--accent-gold)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Request Pending</h3>
                    <p className="text-sm text-white/50 max-w-xs mx-auto">
                      Your join request is being reviewed by the creator.
                    </p>
                  </>
                ) : existingRequest.status === "REJECTED" ? (
                  <>
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                      <XCircle className="h-7 w-7 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Request Not Approved</h3>
                    <p className="text-sm text-white/50 max-w-xs mx-auto">
                      Unfortunately, your join request was not approved this time.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-[var(--accent-teal)]/15 border border-[var(--accent-teal)]/30 flex items-center justify-center animate-glow-pulse">
                      <CheckCircle2 className="h-7 w-7 text-[var(--accent-teal)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">You&apos;re In!</h3>
                    <p className="text-sm text-white/50 max-w-xs mx-auto">
                      Refresh to see the full pact experience.
                    </p>
                  </>
                )}
              </div>
            ) : canJoin ? (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] flex items-center justify-center shadow-lg shadow-[var(--accent-violet)]/30">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Join This Pact</h3>
                  <p className="text-sm text-white/50 max-w-xs mx-auto">
                    Submit your own rule and stake to request membership.
                  </p>
                  {stakes.length > 0 && (
                    <p className="mt-3 text-xs text-white/30 px-3 py-1.5 bg-white/5 rounded-full inline-block">
                      Current stakes: {minStake === maxStake 
                        ? formatAmount(minStake) 
                        : `${formatAmount(minStake)} - ${formatAmount(maxStake)}`}
                    </p>
                  )}
                </div>
                
                <button 
                  onClick={() => setJoinDialogOpen(true)}
                  className={cn(
                    "w-full py-4 rounded-2xl font-semibold text-white",
                    "bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)]",
                    "shadow-lg shadow-[var(--accent-violet)]/30",
                    "hover:shadow-xl hover:shadow-[var(--accent-violet)]/40",
                    "active:scale-[0.98] transition-all duration-200",
                    "flex items-center justify-center gap-2",
                    "min-h-[56px] touch-action-manipulation"
                  )}>
                  <Sparkles className="w-5 h-5" />
                  Join with Your Rule
                </button>
                
                <BottomSheet open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                  <BottomSheetContent className="bg-[var(--dusk-2)] border-white/10">
                    <BottomSheetHeader>
                      <BottomSheetTitle className="text-white text-xl">Join &quot;{group.name}&quot;</BottomSheetTitle>
                      <BottomSheetDescription className="text-white/50">
                        Create your rule to become part of this pact.
                      </BottomSheetDescription>
                    </BottomSheetHeader>
                    <div className="space-y-5 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="ruleTitle" className="text-white/70">Rule Title</Label>
                        <Input
                          id="ruleTitle"
                          placeholder="e.g., Wake up at 6am"
                          value={ruleTitle}
                          onChange={(e) => setRuleTitle(e.target.value)}
                          className="bg-[var(--dusk-3)] border-white/10 focus:border-[var(--accent-violet)]/50 rounded-xl h-12 text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ruleDescription" className="text-white/70">Description</Label>
                        <Textarea
                          id="ruleDescription"
                          placeholder="Describe what completing this rule looks like..."
                          value={ruleDescription}
                          onChange={(e) => setRuleDescription(e.target.value)}
                          className="bg-[var(--dusk-3)] border-white/10 focus:border-[var(--accent-violet)]/50 rounded-xl resize-none text-base"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stakeAmount" className="text-white/70">Stake Amount</Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--accent-gold)]" />
                          <Input
                            id="stakeAmount"
                            type="number"
                            placeholder="500"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            className="bg-[var(--dusk-3)] border-white/10 focus:border-[var(--accent-gold)]/50 rounded-xl h-12 pl-10 text-base"
                            min="1"
                          />
                        </div>
                        {stakes.length > 0 && (
                          <p className="text-xs text-white/40 ml-1">
                            Others have staked {minStake === maxStake 
                              ? formatAmount(minStake) 
                              : `${formatAmount(minStake)} - ${formatAmount(maxStake)}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <BottomSheetFooter className="gap-3 pt-4">
                      <Button 
                        variant="ghost" 
                        onClick={() => setJoinDialogOpen(false)}
                        className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl min-h-[48px] touch-action-manipulation"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSubmitJoin} 
                        disabled={joinMutation.isPending}
                        className={cn(
                          "bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)]",
                          "text-white font-semibold rounded-xl px-6",
                          "hover:shadow-lg hover:shadow-[var(--accent-violet)]/30",
                          "min-h-[48px] touch-action-manipulation"
                        )}
                      >
                        {joinMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit Request"
                        )}
                      </Button>
                    </BottomSheetFooter>
                  </BottomSheetContent>
                </BottomSheet>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <XCircle className="h-7 w-7 text-white/40" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Not Open for Joining</h3>
                <p className="text-sm text-white/50 max-w-xs mx-auto">
                  This pact is {group.status === "ACTIVE" ? "already active" : 
                    group.status === "COMPLETED" ? "completed" : "not accepting new members"}.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
