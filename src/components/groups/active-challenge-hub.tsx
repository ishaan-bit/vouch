"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Camera,
  Clock,
  CheckCircle2,
  AlertCircle,
  Video,
  Calendar,
  Trophy,
  Flame,
  ArrowRight,
} from "lucide-react";

interface Member {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

interface MemberProofStatus {
  memberId: string;
  memberName: string | null;
  memberAvatarUrl: string | null;
  hasProofToday: boolean;
  totalProofs: number;
}

interface ActiveChallengeHubProps {
  groupId: string;
  groupName: string;
  startDate: Date | string;
  endDate: Date | string;
  durationDays: number;
  members: { user: Member }[];
  currentUserId: string;
  onUploadProof: () => void;
}

export function ActiveChallengeHub({
  groupId,
  groupName,
  startDate,
  endDate,
  durationDays,
  members,
  currentUserId,
  onUploadProof,
}: ActiveChallengeHubProps) {
  // Calculate current day
  const { currentDay, daysRemaining, progressPercent, isLastDay } = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    const totalMs = end.getTime() - start.getTime();
    const elapsedMs = now.getTime() - start.getTime();
    const currentDay = Math.min(
      Math.max(1, Math.ceil(elapsedMs / (24 * 60 * 60 * 1000))),
      durationDays
    );
    
    const daysRemaining = Math.max(0, durationDays - currentDay);
    const progressPercent = Math.min(100, (currentDay / durationDays) * 100);
    const isLastDay = currentDay === durationDays;
    
    return { currentDay, daysRemaining, progressPercent, isLastDay };
  }, [startDate, endDate, durationDays]);

  // Calculate time until review call (end date)
  const timeUntilReview = useMemo(() => {
    const end = new Date(endDate);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    
    if (diffMs <= 0) return "Review time!";
    
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h until review`;
    if (hours > 0) return `${hours}h until review`;
    return "Less than 1h until review";
  }, [endDate]);

  // Fetch today's proofs to determine who has posted
  const { data: todayProofs } = useQuery({
    queryKey: ["proofs", groupId, currentDay],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/proofs?day=${currentDay}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Calculate member proof status
  const memberStatus: MemberProofStatus[] = useMemo(() => {
    return members.map((m) => {
      const memberProofs = todayProofs?.filter(
        (p: { uploaderId: string }) => p.uploaderId === m.user.id
      ) || [];
      return {
        memberId: m.user.id,
        memberName: m.user.name,
        memberAvatarUrl: m.user.avatarUrl,
        hasProofToday: memberProofs.length > 0,
        totalProofs: memberProofs.length,
      };
    });
  }, [members, todayProofs]);

  const currentUserStatus = memberStatus.find((s) => s.memberId === currentUserId);
  const membersPosted = memberStatus.filter((s) => s.hasProofToday).length;
  const totalMembers = members.length;

  return (
    <div className="space-y-4">
      {/* Challenge Progress Banner */}
      <div className={cn(
        "p-4 rounded-2xl",
        "bg-gradient-to-br from-[var(--accent-violet)]/20 via-[var(--accent-magenta)]/10 to-transparent",
        "border border-[var(--accent-violet)]/20"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-violet)]/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-[var(--accent-lilac)]" />
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wider">Day</p>
              <p className="text-lg font-bold text-white">
                {currentDay} <span className="text-white/40 text-sm font-normal">of {durationDays}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/50 uppercase tracking-wider">
              {isLastDay ? "Final Day!" : "Remaining"}
            </p>
            <p className={cn(
              "text-lg font-bold",
              isLastDay ? "text-[var(--accent-gold)]" : "text-white"
            )}>
              {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-white/40">
            <span>Started</span>
            <span>{Math.round(progressPercent)}% complete</span>
            <span>Review</span>
          </div>
        </div>
      </div>

      {/* Review Call Countdown */}
      <div className={cn(
        "p-4 rounded-2xl flex items-center justify-between",
        "bg-[var(--dusk-3)]/60 border border-white/[0.06]"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-teal)]/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-[var(--accent-teal)]" />
          </div>
          <div>
            <p className="font-medium text-white">Review Call</p>
            <p className="text-sm text-white/50 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeUntilReview}
            </p>
          </div>
        </div>
        <Link href={`/groups/${groupId}/call`}>
          <Button 
            size="sm"
            className="bg-[var(--accent-teal)]/20 hover:bg-[var(--accent-teal)]/30 text-[var(--accent-teal)] border border-[var(--accent-teal)]/30"
          >
            <Calendar className="w-4 h-4 mr-1" />
            View
          </Button>
        </Link>
      </div>

      {/* Today's Proof Status */}
      <div className={cn(
        "p-4 rounded-2xl",
        "bg-[var(--dusk-3)]/60 border border-white/[0.06]"
      )}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-[var(--accent-lilac)]" />
            Day {currentDay} Proofs
          </h3>
          <span className="text-sm text-white/50">
            {membersPosted}/{totalMembers} posted
          </span>
        </div>

        {/* Member proof status list */}
        <div className="space-y-3">
          {memberStatus.map((status) => (
            <div 
              key={status.memberId}
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl transition-colors",
                status.memberId === currentUserId && "bg-white/[0.03]"
              )}
            >
              <Avatar className="w-8 h-8 border-2 border-transparent">
                <AvatarImage src={status.memberAvatarUrl || undefined} />
                <AvatarFallback className="bg-[var(--accent-violet)]/20 text-white text-xs">
                  {status.memberName?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {status.memberName}
                  {status.memberId === currentUserId && (
                    <span className="text-white/40 ml-1">(You)</span>
                  )}
                </p>
                {status.totalProofs > 1 && (
                  <p className="text-xs text-white/40">{status.totalProofs} proofs</p>
                )}
              </div>
              {status.hasProofToday ? (
                <div className="flex items-center gap-1 text-[var(--accent-teal)]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs">Posted</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[var(--accent-gold)]">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">Pending</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Upload CTA for current user */}
        {!currentUserStatus?.hasProofToday && (
          <Button
            onClick={onUploadProof}
            className={cn(
              "w-full mt-4",
              "bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)]",
              "hover:from-[var(--accent-violet)]/90 hover:to-[var(--accent-magenta)]/90",
              "text-white border-0"
            )}
          >
            <Camera className="w-4 h-4 mr-2" />
            Upload Your Proof
          </Button>
        )}
        
        {currentUserStatus?.hasProofToday && (
          <Button
            onClick={onUploadProof}
            variant="outline"
            className="w-full mt-4 border-white/10 text-white/70 hover:bg-white/5"
          >
            <Camera className="w-4 h-4 mr-2" />
            Add Another Proof
          </Button>
        )}
      </div>

      {/* Leaderboard Preview */}
      <div className={cn(
        "p-4 rounded-2xl",
        "bg-gradient-to-br from-[var(--accent-gold)]/10 to-transparent",
        "border border-[var(--accent-gold)]/20"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-gold)]/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[var(--accent-gold)]" />
            </div>
            <div>
              <p className="font-medium text-white">Challenge Leaderboard</p>
              <p className="text-sm text-white/50">See who's leading</p>
            </div>
          </div>
          <Link href={`/groups/${groupId}/call`}>
            <Button 
              size="sm"
              variant="ghost"
              className="text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10"
            >
              View
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
