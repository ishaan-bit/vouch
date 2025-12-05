"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IndianRupee,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  Clock,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Obligation {
  id: string;
  amount: number;
  status: "PENDING" | "MARKED_PAID" | "CONFIRMED" | "DISPUTED";
  fromUser: { id: string; name: string; image?: string };
  toUser: { id: string; name: string; image?: string; upiId?: string };
  rule: { title: string };
  group: { name: string };
  createdAt: string;
}

export function SettlementList() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data: obligations, isLoading } = useQuery<Obligation[]>({
    queryKey: ["obligations", "me"],
    queryFn: async () => {
      const res = await fetch("/api/payments/obligations/me");
      if (!res.ok) throw new Error("Failed to fetch obligations");
      return res.json();
    },
    enabled: !!session?.user,
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payments/${id}/mark-paid`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to mark paid");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obligations"] });
      toast.success("Marked as paid");
    },
    onError: () => {
      toast.error("Failed to mark as paid");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payments/${id}/confirm`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to confirm");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obligations"] });
      toast.success("Payment confirmed");
    },
    onError: () => {
      toast.error("Failed to confirm payment");
    },
  });

  const openUpiLink = async (obligationId: string) => {
    const res = await fetch(`/api/payments/${obligationId}/upi-link`);
    if (res.ok) {
      const data = await res.json();
      window.open(data.upiLink, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-lilac)]" />
      </div>
    );
  }

  const youOwe =
    obligations?.filter((o) => o.fromUser.id === session?.user?.id) || [];
  const owedToYou =
    obligations?.filter((o) => o.toUser.id === session?.user?.id) || [];

  const totalYouOwe = youOwe.reduce((sum, o) => sum + o.amount, 0);
  const totalOwedToYou = owedToYou.reduce((sum, o) => sum + o.amount, 0);

  const pendingOweCount = youOwe.filter((o) => o.status === "PENDING").length;
  const pendingOwedCount = owedToYou.filter((o) => o.status === "MARKED_PAID").length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className={cn(
          "qd-card p-4 relative overflow-hidden",
          "bg-gradient-to-br from-red-500/10 to-red-500/5",
          "border-red-500/20"
        )}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <ArrowUpRight className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">You Owe</span>
            </div>
            <p className="text-2xl font-bold text-white flex items-center">
              <IndianRupee className="h-5 w-5" />
              {totalYouOwe / 100}
            </p>
            <p className="text-xs text-red-400/70 mt-1">
              {pendingOweCount} pending
            </p>
          </div>
        </div>

        <div className={cn(
          "qd-card p-4 relative overflow-hidden",
          "bg-gradient-to-br from-[var(--accent-teal)]/10 to-[var(--accent-teal)]/5",
          "border-[var(--accent-teal)]/20"
        )}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--accent-teal)]/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[var(--accent-teal)] mb-2">
              <ArrowDownLeft className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Owed to You</span>
            </div>
            <p className="text-2xl font-bold text-white flex items-center">
              <IndianRupee className="h-5 w-5" />
              {totalOwedToYou / 100}
            </p>
            <p className="text-xs text-[var(--accent-teal)]/70 mt-1">
              {pendingOwedCount} awaiting confirmation
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="owe" className="w-full">
        <TabsList className={cn(
          "w-full h-11 p-1 rounded-xl",
          "bg-[var(--dusk-2)]/60 backdrop-blur-xl",
          "border border-white/[0.06]"
        )}>
          <TabsTrigger 
            value="owe"
            className={cn(
              "flex-1 h-full rounded-lg text-sm font-medium transition-all duration-300",
              "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60",
              "data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600",
              "data-[state=active]:text-white data-[state=active]:shadow-md"
            )}
          >
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              You Owe
              {pendingOweCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                  {pendingOweCount}
                </span>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="owed"
            className={cn(
              "flex-1 h-full rounded-lg text-sm font-medium transition-all duration-300",
              "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60",
              "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--accent-teal)] data-[state=active]:to-emerald-500",
              "data-[state=active]:text-white data-[state=active]:shadow-md"
            )}
          >
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4" />
              Owed to You
              {pendingOwedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                  {pendingOwedCount}
                </span>
              )}
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="owe" className="mt-4 space-y-3">
          {youOwe.length === 0 ? (
            <div className="qd-card p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--accent-teal)]/20 to-[var(--accent-teal)]/5 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-[var(--accent-teal)]" />
              </div>
              <p className="text-white font-medium">All Clear!</p>
              <p className="text-white/40 text-sm">
                You don&apos;t owe anyone
              </p>
            </div>
          ) : (
            youOwe.map((obligation) => (
              <ObligationCard
                key={obligation.id}
                obligation={obligation}
                type="owe"
                onMarkPaid={() => markPaidMutation.mutate(obligation.id)}
                onOpenUpi={() => openUpiLink(obligation.id)}
                isPending={markPaidMutation.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="owed" className="mt-4 space-y-3">
          {owedToYou.length === 0 ? (
            <div className="qd-card p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--dusk-3)] flex items-center justify-center">
                <IndianRupee className="h-8 w-8 text-white/40" />
              </div>
              <p className="text-white font-medium">No Pending</p>
              <p className="text-white/40 text-sm">No one owes you money</p>
            </div>
          ) : (
            owedToYou.map((obligation) => (
              <ObligationCard
                key={obligation.id}
                obligation={obligation}
                type="owed"
                onConfirm={() => confirmMutation.mutate(obligation.id)}
                isPending={confirmMutation.isPending}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ObligationCardProps {
  obligation: Obligation;
  type: "owe" | "owed";
  onMarkPaid?: () => void;
  onConfirm?: () => void;
  onOpenUpi?: () => void;
  isPending?: boolean;
}

function ObligationCard({
  obligation,
  type,
  onMarkPaid,
  onConfirm,
  onOpenUpi,
  isPending,
}: ObligationCardProps) {
  const otherUser = type === "owe" ? obligation.toUser : obligation.fromUser;

  const statusConfig = {
    PENDING: {
      label: "Pending",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      icon: Clock,
    },
    MARKED_PAID: {
      label: "Marked Paid",
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      icon: Check,
    },
    CONFIRMED: {
      label: "Confirmed",
      className: "bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] border-[var(--accent-teal)]/30",
      icon: CheckCircle2,
    },
    DISPUTED: {
      label: "Disputed",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
      icon: AlertCircle,
    },
  };

  const status = statusConfig[obligation.status];
  const StatusIcon = status.icon;

  return (
    <div className="qd-card p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 border-2 border-white/10">
          <AvatarImage src={otherUser.image || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white">
            {otherUser.name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-white">{otherUser.name}</p>
            <p className="text-lg font-bold text-[var(--accent-gold)] flex items-center">
              <IndianRupee className="h-4 w-4" />
              {obligation.amount / 100}
            </p>
          </div>

          <p className="text-sm text-white/60 truncate">
            {obligation.rule.title}
          </p>
          <p className="text-xs text-white/40">
            {obligation.group.name}
          </p>

          <div className="flex items-center justify-between mt-3">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
              status.className
            )}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>

            {/* Action buttons */}
            <div className="flex gap-2">
              {type === "owe" && obligation.status === "PENDING" && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onOpenUpi}
                    className="h-8 text-xs text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    UPI
                  </Button>
                  <Button
                    size="sm"
                    onClick={onMarkPaid}
                    disabled={isPending}
                    className={cn(
                      "h-8 text-xs",
                      "bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)]",
                      "hover:opacity-90 border-0"
                    )}
                  >
                    {isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Mark Paid"
                    )}
                  </Button>
                </>
              )}

              {type === "owed" && obligation.status === "MARKED_PAID" && (
                <Button
                  size="sm"
                  onClick={onConfirm}
                  disabled={isPending}
                  className={cn(
                    "h-8 text-xs",
                    "bg-gradient-to-r from-[var(--accent-teal)] to-emerald-500",
                    "hover:opacity-90 border-0"
                  )}
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Confirm
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
