"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Coins, Check, CheckCircle2, Loader2 } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

interface Approval {
  id: string;
  approverId: string;
  ruleId: string;
}

interface RuleCardProps {
  rule: {
    id: string;
    title: string;
    description: string;
    stakeAmount: number;
    approved: boolean;
    creator: User;
    approvals: Approval[];
  };
  currentUserId: string;
  totalMembers: number;
  isPlanning: boolean;
  onApprove?: (ruleId: string) => void;
  isApproving?: boolean;
}

export function RuleCard({
  rule,
  currentUserId,
  totalMembers,
  isPlanning,
  onApprove,
  isApproving = false,
}: RuleCardProps) {
  const isCreator = rule.creator.id === currentUserId;
  const hasApproved = rule.approvals.some((a) => a.approverId === currentUserId);
  const approvalsNeeded = totalMembers - 1;
  const approvalsCount = rule.approvals.length;
  const isApproved = approvalsCount >= approvalsNeeded || rule.approved;

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

  return (
    <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 border border-slate-700 shrink-0">
          <AvatarImage src={rule.creator.avatarUrl || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm">
            {getInitials(rule.creator.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-white">{rule.title}</h3>
            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs">
              For everyone
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">{rule.description}</p>

          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Coins className="h-4 w-4" />
              <span className="text-sm font-medium">{formatAmount(rule.stakeAmount)}</span>
            </div>
            <div className="text-xs text-slate-500">
              Created by {isCreator ? "you" : rule.creator.name?.split(" ")[0]}
            </div>
          </div>

          {/* Approval Status */}
          {isPlanning && !isApproved && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/50">
              <div className="text-xs text-slate-500">
                {approvalsCount}/{approvalsNeeded} approvals
              </div>
              {!isCreator && !hasApproved && onApprove && (
                <Button
                  size="sm"
                  onClick={() => onApprove(rule.id)}
                  disabled={isApproving}
                  className="h-8 px-4 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0"
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1.5" />
                      Approve
                    </>
                  )}
                </Button>
              )}
              {hasApproved && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Approved
                </span>
              )}
              {isCreator && <span className="text-xs text-slate-500">Your rule</span>}
            </div>
          )}
          {isPlanning && isApproved && (
            <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-800/50">
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Fully approved
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
