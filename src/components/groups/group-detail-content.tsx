"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddRuleDialog } from "./add-rule-dialog";
import { AddProofDialog } from "./add-proof-dialog";
import { StoriesRing } from "./stories-viewer";
import { ActiveChallengeHub } from "./active-challenge-hub";
import { PactDeletion } from "./pact-deletion";
import { ProofFeed } from "./proof-feed";
import { toast } from "sonner";
import { PactRing } from "@/components/ui/pact-ring";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Users,
  Clock,
  Plus,
  Check,
  X,
  MessageCircle,
  Video,
  Copy,
  Play,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trophy,
  Coins,
  Camera,
  UserPlus,
  IndianRupee,
  Sparkles,
  Shield,
  Flame,
  Zap,
  Settings,
  ChevronRight,
  ImageIcon,
  LogOut,
  Share2,
  Filter,
  SortAsc,
  FileText,
  Mic,
  Link as LinkIcon,
} from "lucide-react";

// Types
interface User {
  id: string;
  name: string | null;
  username?: string | null;
  avatarUrl: string | null;
  upiId?: string | null;
}

interface Approval {
  id: string;
  approverId: string;
  ruleId: string;
}

interface Rule {
  id: string;
  title: string;
  description: string;
  stakeAmount: number;
  approved: boolean;
  createdAt: Date | string;
  creator: User;
  approvals: Approval[];
}

interface Membership {
  id: string;
  userId: string;
  role: string;
  user: User;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  status: "PLANNING" | "ACTIVE" | "COMPLETED";
  durationDays: number;
  startDate: Date | string | null;
  endDate: Date | string | null;
  createdAt: Date | string;
  createdByUserId: string;
  creator: User;
  memberships: Membership[];
  rules: Rule[];
  _count: {
    proofs: number;
  };
}

interface JoinRequestInfo {
  id: string;
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  rule: {
    id: string;
    title: string;
    description: string;
    stakeAmount: number;
  };
}

interface GroupDetailContentProps {
  group: Group;
  currentUserId: string;
  pendingJoinRequests?: JoinRequestInfo[];
}

export function GroupDetailContent({ group, currentUserId, pendingJoinRequests = [] }: GroupDetailContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [addProofOpen, setAddProofOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Tab state - default to proofs for active groups, rules for planning
  const defaultTab = group.status === "ACTIVE" ? "proofs" : "rules";
  const urlTab = searchParams?.get("tab");
  const [activeTab, setActiveTab] = useState(urlTab || defaultTab);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-open proof dialog if openProof query param is present
  useEffect(() => {
    if (searchParams?.get("openProof") === "true" && group.status === "ACTIVE") {
      setAddProofOpen(true);
      // Clean up the URL
      router.replace(`/groups/${group.id}`, { scroll: false });
    }
  }, [searchParams, group.id, group.status, router]);

  // Update tab from URL params
  useEffect(() => {
    if (urlTab && ["proofs", "rules", "members"].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  // Check if current user has created a rule
  const currentUserRule = group.rules.find((r) => r.creator.id === currentUserId);
  const hasContributedRule = !!currentUserRule;

  // Calculate current day of the challenge
  const getCurrentDay = () => {
    if (!group.startDate || group.status !== "ACTIVE") return 1;
    const start = new Date(group.startDate);
    const now = new Date();
    const elapsedMs = now.getTime() - start.getTime();
    return Math.min(
      Math.max(1, Math.ceil(elapsedMs / (24 * 60 * 60 * 1000))),
      group.durationDays
    );
  };

  // Calculate who hasn't contributed a rule
  const membersWithoutRules = group.memberships.filter(
    (m) => !group.rules.some((r) => r.creator.id === m.userId)
  );

  // Calculate rule approval status
  const approvalsNeeded = group.memberships.length - 1; // All members except rule creator must approve
  const approvedRules = group.rules.filter((rule) => {
    return rule.approved || rule.approvals.length >= approvalsNeeded;
  });
  const allRulesApproved = group.rules.length > 0 && approvedRules.length === group.rules.length;

  // Check if group can start (≥2 members, everyone has a rule, all rules approved)
  const canStartChallenge = 
    group.status === "PLANNING" &&
    group.memberships.length >= 2 &&
    membersWithoutRules.length === 0 &&
    allRulesApproved;

  // Get reason why challenge can't start
  const getStartBlockerMessage = () => {
    if (group.memberships.length < 2) return "Need at least 2 members";
    if (membersWithoutRules.length > 0) {
      const names = membersWithoutRules.map((m) => m.user.name?.split(" ")[0] || "Someone").join(", ");
      return `Waiting for ${names} to add their rule`;
    }
    if (!allRulesApproved) {
      const unapproved = group.rules.length - approvedRules.length;
      return `${unapproved} rule${unapproved > 1 ? "s" : ""} still need approval`;
    }
    return "";
  };

  // Calculate total stake in the pot
  const totalStake = group.rules.reduce((sum, r) => sum + r.stakeAmount, 0);

  // Start challenge mutation
  const startChallengeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${group.id}/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start challenge");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Challenge started! 🚀");
      queryClient.invalidateQueries({ queryKey: ["group", group.id] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Copy invite link (not just code)
  const copyInviteLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteLink = `${baseUrl}/i/${group.inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied!");
  };

  // Copy invite code only
  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.inviteCode);
    toast.success("Invite code copied!");
  };

  // Approve rule mutation
  const approveRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await fetch(`/api/groups/${group.id}/rules/${ruleId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve rule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", group.id] });
      router.refresh();
      toast.success("Rule approved!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Reject rule mutation
  const rejectRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await fetch(`/api/groups/${group.id}/rules/${ruleId}/reject`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject rule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", group.id] });
      router.refresh();
      toast.success("Rule rejected and removed");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Approve join request mutation
  const approveJoinRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/groups/${group.id}/join-requests/${requestId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve request");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", group.id] });
      queryClient.invalidateQueries({ queryKey: ["join-requests", group.id] });
      // Force full page refresh to update server-rendered join requests
      window.location.reload();
      toast.success("Member added to pact!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Reject join request mutation
  const rejectJoinRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/groups/${group.id}/join-requests/${requestId}/reject`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject request");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", group.id] });
      queryClient.invalidateQueries({ queryKey: ["join-requests", group.id] });
      // Force full page refresh to update server-rendered join requests
      window.location.reload();
      toast.success("Request rejected");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Leave pact mutation (for non-creator members during planning)
  const leavePactMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${group.id}/leave`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to leave pact");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("You have left the pact");
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["discover-pacts"] });
      router.push("/");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const formatAmount = (paise: number) => {
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusConfig = () => {
    switch (group.status) {
      case "PLANNING":
        return {
          label: "Planning",
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
          icon: Trophy,
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
      {/* Cinematic Header */}
      <div className="relative h-72 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-violet)]/30 via-[var(--dusk-2)] to-transparent" />
        
        {/* Ambient glows */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[var(--accent-violet)]/20 rounded-full blur-[100px] animate-breathe" />
          {group.status === "ACTIVE" && (
            <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-[var(--accent-teal)]/15 rounded-full blur-[80px] animate-float" />
          )}
        </div>
        
        {/* Back button */}
        <Link
          href="/home"
          className="absolute top-4 left-4 z-20 p-2.5 rounded-xl bg-black/30 backdrop-blur-md border border-white/10 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        
        {/* Action buttons */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <Link
            href={`/groups/${group.id}/chat`}
            className="p-2.5 rounded-xl bg-black/30 backdrop-blur-md border border-white/10 text-white/70 hover:text-white transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
          {group.status === "ACTIVE" && (
            <Link
              href={`/groups/${group.id}/call`}
              className="p-2.5 rounded-xl bg-[var(--accent-violet)]/30 backdrop-blur-md border border-[var(--accent-violet)]/30 text-[var(--accent-lilac)] hover:bg-[var(--accent-violet)]/40 transition-colors"
            >
              <Video className="h-5 w-5" />
            </Link>
          )}
        </div>
        
        {/* Centered Pact Ring */}
        <div className="absolute inset-0 flex items-center justify-center">
          <PactRing size="md">
            <div className="text-center">
              <statusConfig.icon className="w-6 h-6 text-[var(--accent-lilac)] mx-auto mb-1" />
              <span className="text-white/50 text-[10px] uppercase tracking-wider">{statusConfig.label}</span>
            </div>
          </PactRing>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 -mt-16 mx-auto max-w-lg px-4 pb-8">
        {/* Title Card */}
        <div className="qd-card p-5 mb-5">
          <h1 className="text-xl font-bold text-white text-center mb-1">{group.name}</h1>
          {group.description && (
            <p className="text-white/40 text-center text-sm mb-4">{group.description}</p>
          )}
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="p-3 rounded-xl bg-[var(--dusk-3)]/60 border border-white/[0.05] text-center">
              <Shield className="w-4 h-4 text-[var(--accent-lilac)] mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{group.rules.length}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Rules</div>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-b from-[var(--accent-gold)]/15 to-[var(--accent-gold)]/5 border border-[var(--accent-gold)]/20 text-center">
              <Coins className="w-4 h-4 text-[var(--accent-gold)] mx-auto mb-1" />
              <div className="text-lg font-bold text-[var(--accent-gold)]">{formatAmount(totalStake)}</div>
              <div className="text-[10px] text-[var(--accent-gold)]/60 uppercase tracking-wider">Stake</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--dusk-3)]/60 border border-white/[0.05] text-center">
              <ImageIcon className="w-4 h-4 text-[var(--accent-teal)] mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{group._count.proofs}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Proofs</div>
            </div>
          </div>
          
          {/* Members Avatar Stack */}
          <div className="flex items-center justify-center">
            <div className="flex -space-x-2">
              {group.memberships.slice(0, 5).map((m) => (
                <Avatar key={m.id} className="w-8 h-8 border-2 border-[var(--dusk-2)]">
                  <AvatarImage src={m.user.avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white text-xs">
                    {getInitials(m.user.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {group.memberships.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-[var(--dusk-3)] border-2 border-[var(--dusk-2)] flex items-center justify-center text-xs text-white/60">
                  +{group.memberships.length - 5}
                </div>
              )}
            </div>
            <span className="ml-3 text-sm text-white/50">{group.memberships.length} members</span>
          </div>
        </div>

        {/* Invite Code Banner (Planning) */}
        {group.status === "PLANNING" && (
          <div className={cn(
            "mb-5 p-4 rounded-2xl overflow-hidden relative",
            "bg-gradient-to-r from-[var(--accent-violet)]/15 to-[var(--accent-magenta)]/10",
            "border border-[var(--accent-violet)]/20"
          )}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent-violet)]/10 rounded-full blur-[40px]" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-white/50 mb-1">Invite Code</p>
                  <p className="text-xl font-mono font-bold text-white tracking-[0.2em]">
                    {group.inviteCode}
                  </p>
                </div>
                <button
                  onClick={copyInviteCode}
                  className="p-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/15 hover:text-white transition-all"
                  title="Copy code"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={copyInviteLink}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent-violet)]/20 hover:bg-[var(--accent-violet)]/30 text-white/80 hover:text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="h-4 w-4" />
                Share Invite Link
              </button>
            </div>
          </div>
        )}

        {/* Leave Pact Option (for non-creator members during planning) */}
        {group.status === "PLANNING" && group.createdByUserId !== currentUserId && (
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to leave this pact? Your rule will be deleted.")) {
                leavePactMutation.mutate();
              }
            }}
            disabled={leavePactMutation.isPending}
            className={cn(
              "mb-5 w-full p-4 rounded-2xl text-left",
              "bg-[var(--dusk-2)]/60 hover:bg-[var(--dusk-2)]",
              "border border-white/[0.06] hover:border-red-500/30",
              "transition-all group"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white/80 group-hover:text-red-400 transition-colors">Leave Pact</p>
                <p className="text-xs text-white/40">Exit before the challenge starts</p>
              </div>
              {leavePactMutation.isPending && <Loader2 className="w-5 h-5 animate-spin text-white/50" />}
            </div>
          </button>
        )}

        {/* Join Requests Alert (Creator only) */}
        {group.status === "PLANNING" && 
         group.createdByUserId === currentUserId && 
         pendingJoinRequests.length > 0 && (
          <div className="mb-5 p-4 rounded-2xl bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-gold)]/20 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-[var(--accent-gold)]" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{pendingJoinRequests.length} Join Request{pendingJoinRequests.length > 1 ? "s" : ""}</h3>
                <p className="text-xs text-white/50">Review and approve new members</p>
              </div>
            </div>
            <div className="space-y-2">
              {pendingJoinRequests.map((request) => (
                <div key={request.id} className="p-3 rounded-xl bg-[var(--dusk-2)]/80 border border-white/[0.05]">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="w-9 h-9 border border-[var(--accent-gold)]/30">
                      <AvatarImage src={request.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-[var(--accent-gold)] to-orange-500 text-white text-xs">
                        {getInitials(request.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{request.user.name}</p>
                      <p className="text-xs text-white/40 truncate">{request.rule.title}</p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--accent-gold)]">
                      {formatAmount(request.rule.stakeAmount)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => rejectJoinRequestMutation.mutate(request.id)}
                      disabled={rejectJoinRequestMutation.isPending || approveJoinRequestMutation.isPending}
                      className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </button>
                    <button
                      onClick={() => approveJoinRequestMutation.mutate(request.id)}
                      disabled={approveJoinRequestMutation.isPending || rejectJoinRequestMutation.isPending}
                      className="flex-1 py-2 rounded-lg bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] text-sm font-medium hover:bg-[var(--accent-teal)]/30 transition-colors flex items-center justify-center gap-1"
                    >
                      {approveJoinRequestMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Approve
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stories Ring (Active pacts only) */}
        {group.status === "ACTIVE" && (
          <div className="mb-5">
            <StoriesRing groupId={group.id} className="px-1" />
          </div>
        )}

        {/* Active Challenge Hub (Active pacts only) */}
        {group.status === "ACTIVE" && group.startDate && group.endDate && (
          <div className="mb-5">
            <ActiveChallengeHub
              groupId={group.id}
              groupName={group.name}
              startDate={group.startDate}
              endDate={group.endDate}
              durationDays={group.durationDays}
              members={group.memberships}
              currentUserId={currentUserId}
              onUploadProof={() => setAddProofOpen(true)}
            />
          </div>
        )}

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn(
            "w-full h-11 p-1 rounded-xl mb-4",
            "bg-[var(--dusk-2)]/60 backdrop-blur-xl",
            "border border-white/[0.06]"
          )}>
            {group.status === "ACTIVE" && (
              <TabsTrigger 
                value="proofs"
                className={cn(
                  "flex-1 h-full rounded-lg text-sm font-medium transition-all duration-300",
                  "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--accent-violet)] data-[state=active]:to-[var(--accent-magenta)]",
                  "data-[state=active]:text-white data-[state=active]:shadow-md"
                )}
              >
                <Camera className="w-4 h-4 mr-1.5" />
                Proofs
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="rules"
              className={cn(
                "flex-1 h-full rounded-lg text-sm font-medium transition-all duration-300",
                "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--accent-violet)] data-[state=active]:to-[var(--accent-magenta)]",
                "data-[state=active]:text-white data-[state=active]:shadow-md"
              )}
            >
              <Shield className="w-4 h-4 mr-1.5" />
              Rules
            </TabsTrigger>
            <TabsTrigger 
              value="members"
              className={cn(
                "flex-1 h-full rounded-lg text-sm font-medium transition-all duration-300",
                "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--accent-violet)] data-[state=active]:to-[var(--accent-magenta)]",
                "data-[state=active]:text-white data-[state=active]:shadow-md"
              )}
            >
              <Users className="w-4 h-4 mr-1.5" />
              Members
            </TabsTrigger>
          </TabsList>
          
          {/* Proofs Tab - only for ACTIVE groups */}
          {group.status === "ACTIVE" && (
            <TabsContent value="proofs" className="mt-0">
              <ProofFeed 
                groupId={group.id}
                dayIndex={getCurrentDay()}
                members={group.memberships}
                currentUserId={currentUserId}
                durationDays={group.durationDays}
                startDate={group.startDate}
              />
            </TabsContent>
          )}
          
          {/* Rules Tab */}
          <TabsContent value="rules" className="mt-0">
            {/* Add Rule CTA */}
            {group.status === "PLANNING" && !hasContributedRule && (
              <button
                onClick={() => setAddRuleOpen(true)}
                className={cn(
                  "w-full mb-4 p-4 rounded-2xl text-left",
                  "bg-gradient-to-r from-[var(--accent-gold)]/15 to-[var(--accent-gold)]/5",
                  "border border-[var(--accent-gold)]/20 border-dashed",
                  "hover:border-[var(--accent-gold)]/40 transition-colors group"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-gold)]/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5 text-[var(--accent-gold)]" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Add Your Rule</p>
                    <p className="text-xs text-white/40">Everyone must follow your rule</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30 ml-auto" />
                </div>
              </button>
            )}
            
            {group.rules.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--dusk-3)] flex items-center justify-center">
                  <Shield className="w-7 h-7 text-white/30" />
                </div>
                <h3 className="text-lg font-semibold text-white/70 mb-2">No Rules Yet</h3>
                <p className="text-sm text-white/40 max-w-xs mx-auto">
                  Each member must add one rule that everyone follows.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {group.rules.map((rule, index) => {
                  const isCreator = rule.creator.id === currentUserId;
                  const hasApproved = rule.approvals.some((a) => a.approverId === currentUserId);
                  const approvalsNeeded = group.memberships.length - 1;
                  const approvalsCount = rule.approvals.length;
                  const isApproved = approvalsCount >= approvalsNeeded || rule.approved;
                  
                  return (
                    <div
                      key={rule.id}
                      className={cn(
                        "relative p-4 rounded-2xl transition-all duration-300",
                        "bg-[var(--dusk-2)]/60 backdrop-blur-md",
                        "border border-white/[0.06]",
                        "hover:bg-[var(--dusk-2)]/80 hover:border-white/[0.1]"
                      )}
                    >
                      {/* Rule number badge */}
                      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] flex items-center justify-center text-white text-xs font-bold shadow-lg">
                        {index + 1}
                      </div>
                      
                      <div className="flex items-start gap-3 ml-2">
                        <Avatar className="w-9 h-9 border border-white/10 shrink-0">
                          <AvatarImage src={rule.creator.avatarUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white text-xs">
                            {getInitials(rule.creator.name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-white">{rule.title}</h3>
                            {isApproved && group.status === "PLANNING" && (
                              <span className="px-2 py-0.5 rounded-full bg-[var(--accent-teal)]/15 text-[var(--accent-teal)] text-[10px] font-medium">
                                ✓ Approved
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-white/40 mt-1 line-clamp-2">{rule.description}</p>
                          
                          <div className="flex items-center gap-3 mt-3">
                            <span className="px-2.5 py-1 rounded-lg bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/20 text-sm font-semibold text-[var(--accent-gold)]">
                              {formatAmount(rule.stakeAmount)}
                            </span>
                            <span className="text-xs text-white/30">
                              by {isCreator ? "you" : rule.creator.name?.split(" ")[0]}
                            </span>
                          </div>
                          
                          {/* Approval actions (Planning phase) */}
                          {group.status === "PLANNING" && !isApproved && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.05]">
                              <span className="text-xs text-white/40">
                                {approvalsCount}/{approvalsNeeded} approvals
                              </span>
                              {!isCreator && !hasApproved && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => approveRuleMutation.mutate(rule.id)}
                                    disabled={approveRuleMutation.isPending || rejectRuleMutation.isPending}
                                    className="px-4 py-1.5 rounded-lg bg-[var(--accent-teal)]/15 text-[var(--accent-teal)] text-sm font-medium hover:bg-[var(--accent-teal)]/25 transition-colors flex items-center gap-1.5"
                                  >
                                    {approveRuleMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Check className="w-4 h-4" />
                                        Approve
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => rejectRuleMutation.mutate(rule.id)}
                                    disabled={approveRuleMutation.isPending || rejectRuleMutation.isPending}
                                    className="px-4 py-1.5 rounded-lg bg-[var(--accent-magenta)]/15 text-[var(--accent-magenta)] text-sm font-medium hover:bg-[var(--accent-magenta)]/25 transition-colors flex items-center gap-1.5"
                                  >
                                    {rejectRuleMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <X className="w-4 h-4" />
                                        Reject
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                              {hasApproved && (
                                <span className="flex items-center gap-1.5 text-xs text-[var(--accent-teal)]">
                                  <CheckCircle2 className="w-4 h-4" />
                                  You approved
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
          
          {/* Members Tab */}
          <TabsContent value="members" className="mt-0">
            <div className="space-y-2">
              {group.memberships.map((membership) => {
                const hasRule = group.rules.some((r) => r.creator.id === membership.userId);
                const isCreatorMember = membership.userId === group.createdByUserId;
                const isCurrentUser = membership.userId === currentUserId;
                
                return (
                  <div
                    key={membership.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-colors",
                      "bg-[var(--dusk-2)]/40 border border-white/[0.04]",
                      "hover:bg-[var(--dusk-2)]/60"
                    )}
                  >
                    <Avatar className="w-10 h-10 border border-white/10">
                      <AvatarImage src={membership.user.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white text-sm">
                        {getInitials(membership.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">
                          {membership.user.name?.split(" ")[0]}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs text-white/30">(you)</span>
                        )}
                        {isCreatorMember && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--accent-violet)]/20 text-[var(--accent-lilac)] text-[10px] font-medium">
                            Creator
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 truncate">
                        @{membership.user.username || "anonymous"}
                      </p>
                    </div>
                    
                    {group.status === "PLANNING" && (
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center",
                        hasRule 
                          ? "bg-[var(--accent-teal)]/15 text-[var(--accent-teal)]" 
                          : "bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]"
                      )}>
                        {hasRule ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {membersWithoutRules.length > 0 && group.status === "PLANNING" && (
              <p className="text-xs text-[var(--accent-gold)] mt-3 px-1">
                ⚠️ {membersWithoutRules.map((m) => m.user.name?.split(" ")[0]).join(", ")}{" "}
                {membersWithoutRules.length === 1 ? "hasn't" : "haven't"} added a rule yet
              </p>
            )}
          </TabsContent>
        </Tabs>

        {/* Pact Deletion Section */}
        <div className="mt-6">
          <PactDeletion
            groupId={group.id}
            groupName={group.name}
            isCreator={group.createdByUserId === currentUserId}
            currentUserId={currentUserId}
          />
        </div>

        {/* Bottom Actions */}
        {group.status === "PLANNING" && group.createdByUserId === currentUserId && (
          <div className="mt-6 sticky bottom-4">
            <button
              onClick={() => startChallengeMutation.mutate()}
              disabled={!canStartChallenge || startChallengeMutation.isPending}
              className={cn(
                "w-full py-4 rounded-2xl font-semibold text-white",
                "bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)]",
                "shadow-lg shadow-[var(--accent-violet)]/30",
                "hover:shadow-xl hover:shadow-[var(--accent-violet)]/40",
                "active:scale-[0.98] transition-all duration-200",
                "flex items-center justify-center gap-2",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              )}
            >
              {startChallengeMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Challenge
                </>
              )}
            </button>
            {!canStartChallenge && (
              <p className="text-center text-xs text-[var(--accent-gold)] mt-2">
                {getStartBlockerMessage()}
              </p>
            )}
          </div>
        )}

        {/* Active Challenge Status & Post Proof */}
        {group.status === "ACTIVE" && (
          <div className={cn(
            "mt-6 p-5 rounded-3xl overflow-hidden relative",
            "bg-gradient-to-br from-[var(--accent-teal)]/15 via-[var(--dusk-2)] to-[var(--accent-violet)]/10",
            "border border-[var(--accent-teal)]/20"
          )}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-teal)]/10 rounded-full blur-[50px]" />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-teal)]/20 flex items-center justify-center animate-glow-pulse">
                  <Flame className="w-6 h-6 text-[var(--accent-teal)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Challenge Active!</h3>
                  <p className="text-sm text-white/50">Post proofs to stay accountable</p>
                </div>
              </div>
              
              {group.endDate && mounted && (
                <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
                  <Calendar className="h-4 w-4" />
                  <span>Ends {new Date(group.endDate).toLocaleDateString()}</span>
                </div>
              )}
              
              <button
                onClick={() => setAddProofOpen(true)}
                className={cn(
                  "w-full py-4 rounded-2xl font-semibold text-white",
                  "bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)]",
                  "shadow-lg shadow-[var(--accent-violet)]/30",
                  "hover:shadow-xl hover:shadow-[var(--accent-violet)]/40",
                  "active:scale-[0.98] transition-all duration-200",
                  "flex items-center justify-center gap-2"
                )}
              >
                <Camera className="w-5 h-5" />
                Post Proof
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Dialogs */}
      <AddRuleDialog
        open={addRuleOpen}
        onOpenChange={setAddRuleOpen}
        groupId={group.id}
      />
      <AddProofDialog
        open={addProofOpen}
        onOpenChange={setAddProofOpen}
        groupId={group.id}
        rules={group.rules}
      />
    </div>
  );
}
