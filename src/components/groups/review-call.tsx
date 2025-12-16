"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  X,
  XCircle,
  Link2,
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

type VoteValue = "PENDING" | "YES" | "NO";

export function ReviewCall({ groupId, groupName, currentUserId }: ReviewCallProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  
  // State for the voting phase
  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
  // votesMap: ruleId -> Map<memberId, VoteValue> - explicit YES/NO selection required
  const [votesMap, setVotesMap] = useState<Map<string, Map<string, VoteValue>>>(new Map());
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // State for meeting URL
  const [meetingUrlInput, setMeetingUrlInput] = useState("");
  const [showMeetingUrlInput, setShowMeetingUrlInput] = useState(false);

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

  // Update meeting URL mutation
  const updateMeetingUrlMutation = useMutation({
    mutationFn: async (meetingUrl: string) => {
      const res = await fetch(`/api/calls/${call.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update meeting URL");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call", groupId] });
      queryClient.invalidateQueries({ queryKey: ["callDetails", call?.id] });
      setShowMeetingUrlInput(false);
      setMeetingUrlInput("");
      toast.success("Meeting link saved!");
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
      
      // Get ALL members including self (for self-rule voting)
      const allMembers = (callDetails?.group?.memberships || [])
        .map((m: { user: Member }) => m.user);

      // For each of my rules, create votes for all members (including self)
      for (const rule of myRules) {
        const memberVotes = votesMap.get(rule.id);
        
        for (const member of allMembers) {
          const vote = memberVotes?.get(member.id);
          // Only include explicit YES/NO votes, skip PENDING
          if (vote && vote !== "PENDING") {
            votes.push({
              ruleId: rule.id,
              targetUserId: member.id,
              value: vote,
            });
          }
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
      setShowConfirmation(false);
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
        // Include detailed message if available
        const errorMessage = data.message || data.error || "Failed to finalize";
        throw new Error(errorMessage);
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

  // Get ALL rules (user votes on all rules for OTHER members)
  const allRules = useMemo(
    () => rules,
    [rules]
  );

  // For backward compatibility - keeping myRules as alias
  const myRules = allRules;

  // Get OTHER members only (you never vote on yourself)
  const votingMembers = useMemo(
    () => members.filter((m) => m.id !== currentUserId),
    [members, currentUserId]
  );

  // Alias for clarity
  const otherMembers = votingMembers;

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

  // Set explicit YES or NO vote for a member on a rule
  const setMemberVote = (ruleId: string, memberId: string, value: VoteValue) => {
    setVotesMap((prev) => {
      const newMap = new Map(prev);
      const currentRuleVotes = newMap.get(ruleId) || new Map<string, VoteValue>();
      const newRuleVotes = new Map(currentRuleVotes);
      
      newRuleVotes.set(memberId, value);
      newMap.set(ruleId, newRuleVotes);
      return newMap;
    });
  };

  // Get vote value for a member on a rule
  const getMemberVote = (ruleId: string, memberId: string): VoteValue => {
    return votesMap.get(ruleId)?.get(memberId) || "PENDING";
  };

  // Check if all members have been voted on for the current rule (including self)
  const isCurrentRuleComplete = () => {
    if (!currentRule) return false;
    const ruleVotes = votesMap.get(currentRule.id);
    if (!ruleVotes) return false;
    
    return votingMembers.every((member) => {
      const vote = ruleVotes.get(member.id);
      return vote === "YES" || vote === "NO";
    });
  };

  // Check if all rules have complete votes (including self-votes)
  const areAllVotesComplete = () => {
    return myRules.every((rule) => {
      const ruleVotes = votesMap.get(rule.id);
      if (!ruleVotes) return false;
      
      return votingMembers.every((member) => {
        const vote = ruleVotes.get(member.id);
        return vote === "YES" || vote === "NO";
      });
    });
  };

  // Get summary of votes for confirmation (other members only)
  const getVoteSummary = () => {
    return myRules.map((rule) => {
      const ruleVotes = votesMap.get(rule.id);
      const memberVotes = votingMembers.map((member) => ({
        member,
        vote: ruleVotes?.get(member.id) || "PENDING",
      }));
      return { rule, memberVotes };
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
      <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800/50 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-4">
            <Users className="h-8 w-8 text-amber-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Review Call Ready</h3>
          <p className="text-slate-400">
            {call.meetingUrl 
              ? "Join the video call, then vote on who followed the rules"
              : "Add a meeting link so everyone can join the call"}
          </p>
        </div>

        {/* Meeting URL section */}
        <div className="space-y-3">
          {call.meetingUrl ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Video className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-slate-400">Meeting Link</div>
                    <div className="text-emerald-400 text-sm truncate">{call.meetingUrl}</div>
                  </div>
                </div>
                <a
                  href={call.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Join Call
                  </Button>
                </a>
              </div>
            </div>
          ) : showMeetingUrlInput ? (
            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <div className="text-sm text-slate-400 mb-3">
                Paste a Google Meet, Zoom, or Teams link
              </div>
              <div className="flex gap-2">
                <Input
                  value={meetingUrlInput}
                  onChange={(e) => setMeetingUrlInput(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="flex-1 bg-slate-900/50 border-slate-700"
                />
                <Button
                  onClick={() => updateMeetingUrlMutation.mutate(meetingUrlInput)}
                  disabled={!meetingUrlInput || updateMeetingUrlMutation.isPending}
                  className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl"
                >
                  {updateMeetingUrlMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowMeetingUrlInput(false);
                    setMeetingUrlInput("");
                  }}
                  variant="ghost"
                  className="text-slate-400 hover:text-white rounded-xl"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowMeetingUrlInput(true)}
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl h-12"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Add Meeting Link
            </Button>
          )}
        </div>

        {/* Continue to voting button */}
        <Button
          onClick={() => startVotingMutation.mutate()}
          disabled={startVotingMutation.isPending}
          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0 rounded-xl h-12"
        >
          {startVotingMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <ArrowRight className="h-4 w-4 mr-2" />
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
          You don&apos;t have any rules in this group. Wait for others to complete their voting.
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

  // Confirmation dialog
  if (showConfirmation) {
    const voteSummary = getVoteSummary();
    return (
      <div className="space-y-4">
        <div className="p-5 rounded-3xl bg-slate-900/50 border border-amber-500/30">
          <h3 className="text-lg font-semibold text-white mb-2">Confirm Your Votes</h3>
          <p className="text-sm text-amber-400 mb-4">
            Please review your votes before submitting. This action cannot be undone.
          </p>
          
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {voteSummary.map(({ rule, memberVotes }) => (
              <div key={rule.id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span className="font-medium text-white">{rule.title}</span>
                </div>
                <div className="space-y-1">
                  {memberVotes.map(({ member, vote }) => (
                    <div key={member.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">
                        {member.name}
                      </span>
                      <span className={vote === "YES" ? "text-emerald-400" : "text-red-400"}>
                        {vote === "YES" ? "✓ Followed" : "✗ Did not follow"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => setShowConfirmation(false)}
            variant="outline"
            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl"
          >
            Go Back
          </Button>
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
            Confirm & Submit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Join Call Banner - show if meeting URL exists */}
      {call.meetingUrl && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Video className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">Video Call Active</div>
                <div className="text-xs text-slate-400">Vote while on the call</div>
              </div>
            </div>
            <a
              href={call.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
                <ExternalLink className="h-4 w-4 mr-1" />
                Join
              </Button>
            </a>
          </div>
        </div>
      )}

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
            <p className="text-sm text-slate-300 mb-1">
              Did each member follow this rule for the entire pact?
            </p>
            <p className="text-xs text-amber-400">
              Vote YES or NO for each other member. You don't vote on yourself.
            </p>
          </div>

          {/* Member voting - explicit YES/NO buttons (including self) */}
          <div className="space-y-3">
            {votingMembers.map((member) => {
              const vote = getMemberVote(currentRule.id, member.id);
              return (
                <div
                  key={member.id}
                  className={`p-3 rounded-xl transition-all ${
                    vote === "PENDING"
                      ? "bg-slate-800/50 border border-slate-700/50"
                      : vote === "YES"
                      ? "bg-emerald-500/10 border border-emerald-500/30"
                      : "bg-red-500/10 border border-red-500/30"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback className="bg-violet-500/20 text-violet-300 text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-white flex-1">
                      {member.name}
                    </span>
                    {vote === "YES" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                    {vote === "NO" && <XCircle className="h-5 w-5 text-red-400" />}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setMemberVote(currentRule.id, member.id, "YES")}
                      size="sm"
                      className={`flex-1 rounded-lg transition-all ${
                        vote === "YES"
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "bg-slate-700/50 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300"
                      }`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Yes, followed
                    </Button>
                    <Button
                      onClick={() => setMemberVote(currentRule.id, member.id, "NO")}
                      size="sm"
                      className={`flex-1 rounded-lg transition-all ${
                        vote === "NO"
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-slate-700/50 text-slate-300 hover:bg-red-500/20 hover:text-red-300"
                      }`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      No, didn't follow
                    </Button>
                  </div>
                </div>
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
            disabled={!isCurrentRuleComplete()}
            className={`flex-1 rounded-xl ${
              isCurrentRuleComplete()
                ? "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }`}
          >
            {isCurrentRuleComplete() ? (
              <>
                Next Rule
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              "Vote on all members to continue"
            )}
          </Button>
        ) : (
          <Button
            onClick={() => setShowConfirmation(true)}
            disabled={!areAllVotesComplete()}
            className={`flex-1 rounded-xl ${
              areAllVotesComplete()
                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white"
                : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
            }`}
          >
            {areAllVotesComplete() ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Review & Submit
              </>
            ) : (
              "Vote on all members to continue"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
