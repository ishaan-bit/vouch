"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Calendar, 
  ChevronRight, 
  Users, 
  Trophy,
  Coins,
  Flame,
  Sparkles,
  Zap,
  Clock,
  Target,
} from "lucide-react";
import { formatDistanceToNow, differenceInDays, format, differenceInHours } from "date-fns";

interface HomeContentProps {
  userId: string;
}

interface Group {
  id: string;
  name: string;
  slug: string;
  status: "PLANNING" | "ACTIVE" | "COMPLETED";
  durationDays: number;
  startDate: string | null;
  endDate: string | null;
  createdByUserId: string;
  memberships: {
    user: {
      id: string;
      name: string | null;
      avatarUrl: string | null;
      image: string | null;
    };
    isReady: boolean;
  }[];
  _count: {
    rules: number;
  };
}

interface UpcomingCall {
  id: string;
  scheduledAt: string;
  group: {
    id: string;
    name: string;
  };
}

export function HomeContent({ userId }: HomeContentProps) {
  const { data: groups, isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["my-groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
  });

  const { data: upcomingCalls } = useQuery<UpcomingCall[]>({
    queryKey: ["upcoming-calls"],
    queryFn: async () => {
      const res = await fetch("/api/calls/upcoming");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const activeGroups = groups?.filter((g) => g.status === "ACTIVE") || [];
  const planningGroups = groups?.filter((g) => g.status === "PLANNING") || [];
  const completedCount = groups?.filter((g) => g.status === "COMPLETED").length || 0;

  const getCurrentDay = (startDate: string | null, durationDays: number) => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    return Math.min(differenceInDays(now, start) + 1, durationDays);
  };

  const getTimeRemaining = (endDate: string | null) => {
    if (!endDate) return "";
    const end = new Date(endDate);
    const now = new Date();
    const hours = differenceInHours(end, now);
    if (hours < 24) return `${hours}h left`;
    return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
  };

  return (
    <div className="min-h-screen">
      <div className="relative px-4 py-6 space-y-7 max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-white via-[var(--accent-lilac)] to-white bg-clip-text text-transparent">
                Home
              </span>
            </h1>
            <p className="text-sm text-white/40">
              {format(new Date(), "EEEE, MMMM d")}
            </p>
          </div>
          <Link href="/groups/create">
            <button className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm",
              "bg-gradient-to-r from-[var(--accent-gold)] to-orange-500",
              "text-white shadow-lg shadow-[var(--accent-gold)]/20",
              "hover:shadow-xl hover:shadow-[var(--accent-gold)]/30",
              "active:scale-[0.97] transition-all duration-200"
            )}>
              <Plus className="h-4 w-4" />
              New Pact
            </button>
          </Link>
        </div>

        {/* Active Groups */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-teal)]/20 to-[var(--accent-teal)]/5 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[var(--accent-teal)]" />
            </div>
            <h2 className="font-semibold text-white">Active Pacts</h2>
            {activeGroups.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--accent-teal)]/15 text-[var(--accent-teal)] text-xs font-medium">
                {activeGroups.length}
              </span>
            )}
          </div>

          {groupsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-36 rounded-2xl bg-[var(--dusk-2)]/60 animate-pulse" />
              ))}
            </div>
          ) : activeGroups.length === 0 ? (
            <div className={cn(
              "rounded-3xl p-8 text-center",
              "bg-[var(--dusk-2)]/40 backdrop-blur-sm",
              "border border-dashed border-white/10"
            )}>
              <div className="w-16 h-16 rounded-full bg-[var(--dusk-3)] flex items-center justify-center mx-auto mb-4">
                <Target className="w-7 h-7 text-white/30" />
              </div>
              <p className="text-white font-medium mb-2">No active pacts yet</p>
              <p className="text-white/40 text-sm mb-5 max-w-xs mx-auto">
                Start a pact with friends and hold each other accountable.
              </p>
              <Link href="/groups/create">
                <button className={cn(
                  "px-6 py-3 rounded-xl font-semibold text-sm",
                  "bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)]",
                  "text-white shadow-lg shadow-[var(--accent-violet)]/20",
                  "hover:shadow-xl hover:shadow-[var(--accent-violet)]/30",
                  "transition-all duration-200"
                )}>
                  Create Your First Pact
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {activeGroups.map((group) => {
                const currentDay = getCurrentDay(group.startDate, group.durationDays);
                const progress = (currentDay / group.durationDays) * 100;
                return (
                  <Link key={group.id} href={`/groups/${group.id}`}>
                    <div className={cn(
                      "rounded-2xl p-5 transition-all duration-300 group",
                      "bg-[var(--dusk-2)]/60 backdrop-blur-md",
                      "border border-white/[0.06]",
                      "hover:bg-[var(--dusk-2)]/80 hover:border-white/[0.1]",
                      "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[var(--accent-violet)]/10"
                    )}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white group-hover:text-[var(--accent-lilac)] transition-colors">
                            {group.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              "bg-[var(--accent-teal)]/15 text-[var(--accent-teal)]",
                              "border border-[var(--accent-teal)]/20"
                            )}>
                              Day {currentDay} of {group.durationDays}
                            </span>
                            <span className="text-xs text-white/40 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getTimeRemaining(group.endDate)}
                            </span>
                          </div>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-[var(--accent-violet)]/20 transition-colors">
                          <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-[var(--accent-lilac)] transition-colors" />
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-2 bg-[var(--dusk-3)] rounded-full overflow-hidden mb-4 relative">
                        <div 
                          className="h-full bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-teal)] rounded-full transition-all duration-500 relative"
                          style={{ width: `${progress}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        </div>
                      </div>

                      {/* Members & Rules */}
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {group.memberships.slice(0, 4).map((m) => (
                            <Avatar key={m.user.id} className="h-8 w-8 border-2 border-[var(--dusk-2)]">
                              <AvatarImage src={m.user.avatarUrl || m.user.image || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white text-xs">
                                {m.user.name?.[0] || "?"}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {group.memberships.length > 4 && (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--dusk-2)] bg-[var(--dusk-3)] text-xs text-white/60">
                              +{group.memberships.length - 4}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-white/40 px-2 py-1 rounded-lg bg-white/5">
                          {group._count.rules} rules
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Setting Up Groups */}
        {planningGroups.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-gold)]/20 to-[var(--accent-gold)]/5 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
              </div>
              <h2 className="font-semibold text-white">Setting Up</h2>
              <span className="px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] text-xs font-medium">
                {planningGroups.length}
              </span>
            </div>
            <div className="space-y-3">
              {planningGroups.map((group) => {
                const membersWithRules = group.memberships.filter(m => m.isReady).length;
                const totalMembers = group.memberships.length;
                const isCreator = group.createdByUserId === userId;
                const canStart = isCreator && membersWithRules >= 2 && membersWithRules === totalMembers;
                
                return (
                  <Link key={group.id} href={`/groups/${group.id}`}>
                    <div className={cn(
                      "rounded-2xl p-4 transition-all duration-300 group",
                      "bg-[var(--dusk-2)]/40 backdrop-blur-sm",
                      "border border-dashed border-white/10",
                      "hover:border-[var(--accent-gold)]/30 hover:bg-[var(--dusk-2)]/60"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">{group.name}</h3>
                          <p className="text-sm text-white/40 mt-1">
                            {membersWithRules}/{totalMembers} ready • {group.durationDays} days
                          </p>
                          {canStart && (
                            <p className="text-xs text-[var(--accent-teal)] mt-2 flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Ready to start!
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <span className={cn(
                            "text-xs px-2.5 py-1 rounded-full font-medium",
                            "bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]",
                            "border border-[var(--accent-gold)]/20"
                          )}>
                            Planning
                          </span>
                          <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-[var(--accent-gold)] transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Upcoming Calls */}
        {upcomingCalls && upcomingCalls.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-violet)]/20 to-[var(--accent-violet)]/5 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[var(--accent-lilac)]" />
              </div>
              <h2 className="font-semibold text-white">Upcoming Calls</h2>
            </div>
            <div className="space-y-3">
              {upcomingCalls.map((call) => (
                <Link key={call.id} href={`/groups/${call.group.id}/call`}>
                  <div className={cn(
                    "rounded-2xl p-4 transition-all duration-300 group",
                    "bg-gradient-to-r from-[var(--accent-violet)]/15 to-[var(--accent-magenta)]/10",
                    "border border-[var(--accent-violet)]/20",
                    "hover:border-[var(--accent-violet)]/40 hover:shadow-lg hover:shadow-[var(--accent-violet)]/10"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--accent-violet)]/20 flex items-center justify-center animate-glow-pulse">
                        <Calendar className="w-6 h-6 text-[var(--accent-lilac)]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white">{call.group.name}</h3>
                        <p className="text-sm text-[var(--accent-lilac)]">
                          {formatDistanceToNow(new Date(call.scheduledAt), { addSuffix: true })}
                        </p>
                      </div>
                      <button className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium",
                        "bg-[var(--accent-violet)] text-white",
                        "hover:bg-[var(--accent-violet)]/90 transition-colors"
                      )}>
                        Join
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Stats */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-magenta)]/20 to-[var(--accent-magenta)]/5 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-[var(--accent-magenta)]" />
            </div>
            <h2 className="font-semibold text-white">Your Progress</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className={cn(
              "rounded-2xl p-4 text-center",
              "bg-[var(--dusk-2)]/40 backdrop-blur-sm",
              "border border-white/[0.05]"
            )}>
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-teal)]/15 flex items-center justify-center mx-auto mb-2">
                <Trophy className="w-5 h-5 text-[var(--accent-teal)]" />
              </div>
              <p className="text-2xl font-bold text-white">{completedCount}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Completed</p>
            </div>
            <div className={cn(
              "rounded-2xl p-4 text-center",
              "bg-[var(--dusk-2)]/40 backdrop-blur-sm",
              "border border-white/[0.05]"
            )}>
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-violet)]/15 flex items-center justify-center mx-auto mb-2">
                <Flame className="w-5 h-5 text-[var(--accent-lilac)]" />
              </div>
              <p className="text-2xl font-bold text-white">{activeGroups.length}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Active</p>
            </div>
            <div className={cn(
              "rounded-2xl p-4 text-center",
              "bg-gradient-to-b from-[var(--accent-gold)]/10 to-transparent",
              "border border-[var(--accent-gold)]/15"
            )}>
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-gold)]/15 flex items-center justify-center mx-auto mb-2">
                <Coins className="w-5 h-5 text-[var(--accent-gold)]" />
              </div>
              <p className="text-2xl font-bold text-[var(--accent-gold)]">₹0</p>
              <p className="text-[10px] text-[var(--accent-gold)]/60 uppercase tracking-wider">Earned</p>
            </div>
          </div>
        </section>

        {/* Bottom padding for nav */}
        <div className="h-20" />
      </div>
    </div>
  );
}
