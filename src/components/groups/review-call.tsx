"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Video,
  Phone,
  Check,
  Loader2,
  Users,
  CheckCircle2,
  Trophy,
  Coins,
  ArrowRight,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { buildUpiUri } from "@/lib/upi";

interface ReviewCallProps {
  groupId: string;
  groupName: string;
  currentUserId: string;
}

interface Member {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  upiId: string | null;
}

interface Rule {
  id: string;
  title: string;
  description?: string;
  stakeAmount: number;
  creatorId: string;
  creator: { id: string; name: string | null; avatarUrl: string | null };
}

interface Obligation {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  status: string;
  fromUser?: { id: string; name: string | null; username: string | null; avatarUrl: string | null };
  toUser?: { id: string; name: string | null; username: string | null; avatarUrl: string | null; upiId: string | null };
  rule: { id: string; title: string; description: string | null };
  group: { id: string; name: string | null };
}

export function ReviewCall({ groupId, groupName, currentUserId }: ReviewCallProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  // State for the voting phase
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
  const [votesMap, setVotesMap] = useState<Map<string, Set<string>>>(new Map()); // ruleId -> Set of memberIds who followed
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Fetch active call
  const { data: call, isLoading: callLoading } = useQuery({
    queryKey: ["call", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/calls?groupId=${groupId}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Fetch call details with rules and members
  const { data: callDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ["callDetails", call?.id],
    queryFn: async () => {
      const res = await fetch(`/api/calls/${call.id}`);
      if (!res.ok) throw new Error("Failed to fetch call");
      return res.json();
    },
    enabled: !!call?.id,
  });

  // Fetch obligations for this group
  const { data: obligations } = useQuery<{ owed: Obligation[]; receiving: Obligation[] }>({
    queryKey: ["obligations", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/payments/obligations/me?groupId=${groupId}`);
      if (!res.ok) return { owed: [], receiving: [] };
      return res.json();
    },
    enabled: !!call?.id && (call?.status === "COMPLETED" || hasSubmitted),
  });

  // Create call mutation
  const createCallMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create call");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call", groupId] });
      toast.success("Review call created!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Start voting mutation
  const startVotingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/calls/${call.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ONGOING" }),
      });
      if (!res.ok) throw new Error("Failed to start voting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call", groupId] });
    },
  });

  // Submit votes mutation
  const submitVotesMutation = useMutation({
    mutationFn: async () => {
      // Build votes array from votesMap
      const votes: { ruleId: string; targetUserId: string; value: "YES" | "NO" }[] = [];
      
      // Get my rules
      const myRules = (callDetails?.group?.rules || []).filter(
        (r: Rule) => r.creatorId === currentUserId
      );
      
      // Get all other members
      const otherMembers = (callDetails?.group?.memberships || [])
        .map((m: { user: Member }) => m.user)
        .filter((m: Member) => m.id !== currentUserId);

      // For each of my rules, create votes for all members
      for (const rule of myRules) {
        const followedSet = votesMap.get(rule.id) || new Set();
        
        for (const member of otherMembers) {
          votes.push({
            ruleId: rule.id,
            targetUserId: member.id,
            value: followedSet.has(member.id) ? "YES" : "NO",
          });
        }
      }

      const res = await fetch("/api/votes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callSessionId: call.id,
          votes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit votes");
      }

      return res.json();
    },
    onSuccess: () => {
      setHasSubmitted(true);
      toast.success("Your vouches have been recorded!");
      queryClient.invalidateQueries({ queryKey: ["call", groupId] });
      queryClient.invalidateQueries({ queryKey: ["obligations", call?.id] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Finalize call and compute payouts mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/calls/${call.id}/finalize`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to finalize");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Voting finalized! Payment obligations calculated.");
      queryClient.invalidateQueries({ queryKey: ["call", groupId] });
      queryClient.invalidateQueries({ queryKey: ["obligations", groupId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Mark as paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (obligationId: string) => {
      const res = await fetch(`/api/payments/${obligationId}/mark-paid`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to mark as paid");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Marked as paid!");
      queryClient.invalidateQueries({ queryKey: ["obligations", groupId] });
    },
  });

  // Confirm received mutation
  const confirmReceivedMutation = useMutation({
    mutationFn: async (obligationId: string) => {
      const res = await fetch(`/api/payments/${obligationId}/confirm`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to confirm");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Payment confirmed!");
      queryClient.invalidateQueries({ queryKey: ["obligations", groupId] });
    },
  });

  // Derived data
  const rules: Rule[] = useMemo(
    () => callDetails?.group?.rules || [],
    [callDetails]
  );

  const members: Member[] = useMemo(
    () => callDetails?.group?.memberships?.map((m: { user: Member }) => m.user) || [],
    [callDetails]
  );

  // Get only the current user's rules
  const myRules = useMemo(
    () => rules.filter((r) => r.creatorId === currentUserId),
    [rules, currentUserId]
  );

  // Get other members (excluding self)
  const otherMembers = useMemo(
    () => members.filter((m) => m.id !== currentUserId),
    [members, currentUserId]
  );

  const currentRule = myRules[currentRuleIndex];

  // Helper functions
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatAmount = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

  const toggleMemberVote = (ruleId: string, memberId: string) => {
    setVotesMap((prev) => {
      const newMap = new Map(prev);
      const currentSet = newMap.get(ruleId) || new Set();
      const newSet = new Set(currentSet);
      
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      
      newMap.set(ruleId, newSet);
      return newMap;
    });
  };

  const handleNextRule = () => {
    if (currentRuleIndex < myRules.length - 1) {
      setCurrentRuleIndex((prev) => prev + 1);
    }
  };

  const handlePrevRule = () => {
    if (currentRuleIndex > 0) {
      setCurrentRuleIndex((prev) => prev - 1);
    }
  };

  // Obligations split
  const myObligationsOwed = useMemo(
    () => obligations?.owed || [],
    [obligations]
  );

  const myObligationsReceiving = useMemo(
    () => obligations?.receiving || [],
    [obligations]
  );

  const totalOwed = useMemo(
    () => myObligationsOwed.reduce((sum, o) => sum + o.amount, 0),
    [myObligationsOwed]
  );

  const totalReceiving = useMemo(
    () => myObligationsReceiving.reduce((sum, o) => sum + o.amount, 0),
    [myObligationsReceiving]
  );

  // Loading state
  if (callLoading || detailsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // No active call - show start button
  if (!call) {
    return (
      <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-violet-500/20 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/20 mb-4">
          <Video className="h-8 w-8 text-violet-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Ready for Review?</h3>
        <p className="text-slate-400 mb-6">
          Start the end-of-cycle review to vote on who kept their word
        </p>
        <Button
          onClick={() => createCallMutation.mutate()}
          disabled={createCallMutation.isPending}
          className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0 rounded-xl"
        >
          {createCallMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Phone className="h-4 w-4 mr-2" />
          )}
          Start Review Call
        </Button>
      </div>
    );
  }

  // Call scheduled - waiting to start voting
  if (call.status === "SCHEDULED") {
    return (
      <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800/50 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-4">
          <Users className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Call Ready</h3>
        <p className="text-slate-400 mb-6">
          Click below to start voting on who followed the rules
        </p>
        <Button
          onClick={() => startVotingMutation.mutate()}
          disabled={startVotingMutation.isPending}
          className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0 rounded-xl"
        >
          {startVotingMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Video className="h-4 w-4 mr-2" />
          )}
          Continue to Voting
        </Button>
      </div>
    );
  }

  // Call completed - show settlement summary
  if (call.status === "COMPLETED" || hasSubmitted) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/20 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-white mb-1">
            {hasSubmitted && call.status !== "COMPLETED" 
              ? "Thanks! Your vouches are recorded." 
              : "Review Complete!"}
          </h3>
          <p className="text-slate-400">
            {hasSubmitted && call.status !== "COMPLETED"
              ? "You'll see the payout summary after everyone has voted."
              : "Here's the settlement summary:"}
          </p>
        </div>

        {/* Finalize button if voting done but not finalized */}
        {hasSubmitted && call.status === "ONGOING" && (
          <Button
            onClick={() => finalizeMutation.mutate()}
            disabled={finalizeMutation.isPending}
            className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white border-0 rounded-xl h-12"
          >
            {finalizeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trophy className="h-4 w-4 mr-2" />
            )}
            Finalize & Calculate Payouts
          </Button>
        )}

        {/* Settlement summary - only show when there are obligations */}
        {obligations && (obligations.owed.length > 0 || obligations.receiving.length > 0) && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-sm text-emerald-400 mb-1">You Receive</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {formatAmount(totalReceiving)}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                <div className="text-sm text-orange-400 mb-1">You Owe</div>
                <div className="text-2xl font-bold text-orange-400">
                  {formatAmount(totalOwed)}
                </div>
              </div>
            </div>

            {/* You owe section */}
            {myObligationsOwed.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  You Owe
                </h4>
                {myObligationsOwed.map((ob) => (
                  <div
                    key={ob.id}
                    className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={ob.toUser?.avatarUrl || undefined} />
                        <AvatarFallback className="bg-violet-500/20 text-violet-300">
                          {getInitials(ob.toUser?.name || null)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-white">{ob.toUser?.name || "Unknown"}</div>
                        <div className="text-sm text-slate-400">{ob.rule.title}</div>
                      </div>
                      <div className="text-lg font-bold text-orange-400">
                        {formatAmount(ob.amount)}
                      </div>
                    </div>
                    
                    {/* Status / Actions */}
                    {ob.status === "PENDING" && ob.toUser?.upiId && (
                      <div className="flex gap-2">
                        <a
                          href={buildUpiUri({
                            payeeVpa: ob.toUser.upiId,
                            payeeName: ob.toUser.name || "User",
                            amountInRupees: ob.amount / 100,
                            txnNote: `Vouch payment for ${ob.rule.title}`,
                          })}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 rounded-xl"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Pay via UPI
                          </Button>
                        </a>
                        <Button
                          onClick={() => markPaidMutation.mutate(ob.id)}
                          disabled={markPaidMutation.isPending}
                          className="flex-1 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-0 rounded-xl"
                        >
                          Mark as Paid
                        </Button>
                      </div>
                    )}
                    {ob.status === "MARKED_PAID" && (
                      <div className="text-sm text-amber-400 text-center py-2 bg-amber-500/10 rounded-xl">
                        Waiting for confirmation...
                      </div>
                    )}
                    {ob.status === "CONFIRMED" && (
                      <div className="text-sm text-emerald-400 text-center py-2 bg-emerald-500/10 rounded-xl flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Payment Confirmed
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* You receive section */}
            {myObligationsReceiving.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  You Receive
                </h4>
                {myObligationsReceiving.map((ob) => (
                  <div
                    key={ob.id}
                    className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={ob.fromUser?.avatarUrl || undefined} />
                        <AvatarFallback className="bg-violet-500/20 text-violet-300">
                          {getInitials(ob.fromUser?.name || null)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-white">{ob.fromUser?.name || "Unknown"}</div>
                        <div className="text-sm text-slate-400">{ob.rule.title}</div>
                      </div>
                      <div className="text-lg font-bold text-emerald-400">
                        {formatAmount(ob.amount)}
                      </div>
                    </div>
                    
                    {/* Status / Actions */}
                    {ob.status === "PENDING" && (
                      <div className="text-sm text-slate-400 text-center py-2">
                        Waiting for payment...
                      </div>
                    )}
                    {ob.status === "MARKED_PAID" && (
                      <Button
                        onClick={() => confirmReceivedMutation.mutate(ob.id)}
                        disabled={confirmReceivedMutation.isPending}
                        className="w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0 rounded-xl"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Confirm Received
                      </Button>
                    )}
                    {ob.status === "CONFIRMED" && (
                      <div className="text-sm text-emerald-400 text-center py-2 bg-emerald-500/10 rounded-xl flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Payment Received
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* No obligations message */}
        {obligations && obligations.owed.length === 0 && obligations.receiving.length === 0 && call.status === "COMPLETED" && (
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/50 text-center">
            <p className="text-slate-400">No payment obligations for this cycle.</p>
          </div>
        )}
      </div>
    );
  }

  // Call ongoing - voting interface
  // Only show voting UI if user has rules to vote on
  if (myRules.length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800/50 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
          <Users className="h-8 w-8 text-slate-500" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Rules to Vote On</h3>
        <p className="text-slate-400 mb-6">
          You don't have any rules in this group. Wait for others to complete their voting.
        </p>
        <Button
          onClick={() => setHasSubmitted(true)}
          className="bg-slate-800 hover:bg-slate-700 text-white border-0 rounded-xl"
        >
          View Settlement Summary
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Vouch for Members</h3>
          <p className="text-sm text-slate-400">
            Rule {currentRuleIndex + 1} of {myRules.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {myRules.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full ${
                idx === currentRuleIndex
                  ? "bg-violet-500"
                  : idx < currentRuleIndex
                  ? "bg-emerald-500"
                  : "bg-slate-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Current rule card */}
      {currentRule && (
        <div className="p-5 rounded-3xl bg-slate-900/50 border border-slate-800/50">
          {/* Rule info */}
          <div className="mb-4 pb-4 border-b border-slate-800/50">
            <div className="flex items-center gap-2 text-sm text-amber-400 mb-2">
              <Coins className="h-4 w-4" />
              <span>{formatAmount(currentRule.stakeAmount)} stake</span>
            </div>
            <h4 className="text-lg font-medium text-white">{currentRule.title}</h4>
            {currentRule.description && (
              <p className="text-sm text-slate-400 mt-1">{currentRule.description}</p>
            )}
          </div>

          {/* Voting prompt */}
          <div className="mb-4">
            <p className="text-sm text-slate-300 mb-3">
              Who actually followed this rule for the entire pact?
            </p>
          </div>

          {/* Member checkboxes */}
          <div className="space-y-2">
            {otherMembers.map((member) => {
              const isChecked = votesMap.get(currentRule.id)?.has(member.id) || false;
              return (
                <button
                  key={member.id}
                  onClick={() => toggleMemberVote(currentRule.id, member.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isChecked
                      ? "bg-emerald-500/20 border border-emerald-500/30"
                      : "bg-slate-800/50 border border-slate-700/50 hover:border-slate-600"
                  }`}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleMemberVote(currentRule.id, member.id)}
                    className="border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback className="bg-violet-500/20 text-violet-300 text-xs">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`font-medium ${isChecked ? "text-emerald-300" : "text-white"}`}>
                    {member.name}
                  </span>
                  {isChecked && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {currentRuleIndex > 0 && (
          <Button
            onClick={handlePrevRule}
            variant="outline"
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl"
          >
            Previous
          </Button>
        )}
        
        {currentRuleIndex < myRules.length - 1 ? (
          <Button
            onClick={handleNextRule}
            className="flex-1 bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border-0 rounded-xl"
          >
            Next Rule
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={() => submitVotesMutation.mutate()}
            disabled={submitVotesMutation.isPending}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0 rounded-xl"
          >
            {submitVotesMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Submit Vouches
          </Button>
        )}
      </div>
    </div>
  );
}
