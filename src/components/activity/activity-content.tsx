"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  UserPlus,
  UserMinus,
  Users,
  Camera,
  Video,
  DollarSign,
  Check,
  X,
  Loader2,
  ArrowRight,
  IndianRupee,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ActivityContentProps {
  userId: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

const notificationIcons: Record<string, React.ElementType> = {
  FRIEND_REQUEST: UserPlus,
  FRIEND_ACCEPTED: UserPlus,
  GROUP_INVITE: Users,
  PACT_MEMBER_ADDED: Users,
  JOIN_REQUEST: Users,
  MEMBER_LEFT: UserMinus,
  PROOF_REACTION: Camera,
  CALL_REMINDER: Video,
  PAYMENT_RECEIVED: DollarSign,
  PAYMENT_DUE: DollarSign,
  GROUP_STARTED: Users,
  NEW_MESSAGE: Bell,
  OTHER: Bell,
};

export function ActivityContent({ userId }: ActivityContentProps) {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const respondToRequestMutation = useMutation({
    mutationFn: async ({ friendshipId, accept }: { friendshipId: string; accept: boolean }) => {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, accept }),
      });
      if (!res.ok) throw new Error("Failed to respond");
      return res.json();
    },
    onSuccess: (_, { accept }) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      toast.success(accept ? "Friend request accepted!" : "Friend request declined");
    },
    onError: () => {
      toast.error("Failed to respond to request");
    },
  });

  // Group notifications by time period
  const groupedNotifications = {
    today: [] as Notification[],
    thisWeek: [] as Notification[],
    earlier: [] as Notification[],
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  notifications?.forEach((n) => {
    const date = new Date(n.createdAt);
    if (date >= todayStart) {
      groupedNotifications.today.push(n);
    } else if (date >= weekStart) {
      groupedNotifications.thisWeek.push(n);
    } else {
      groupedNotifications.earlier.push(n);
    }
  });

  const renderNotification = (notification: Notification) => {
    const Icon = notificationIcons[notification.type] || Bell;
    const isFriendRequest = notification.type === "FRIEND_REQUEST";
    const isJoinRequest = notification.type === "JOIN_REQUEST";

    return (
      <div
        key={notification.id}
        className={cn(
          "relative rounded-2xl transition-all duration-300 overflow-hidden",
          "bg-[var(--dusk-2)]/60 backdrop-blur-xl",
          "border border-white/[0.06]",
          notification.isRead && "opacity-60"
        )}
        style={{
          boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
        onClick={() => !notification.isRead && markReadMutation.mutate(notification.id)}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-violet)]/20">
            <Icon className="h-5 w-5 text-[var(--accent-lilac)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white">{notification.title}</p>
            {notification.message && (
              <p className="text-sm text-white/50">{notification.message}</p>
            )}
            <p className="mt-1 text-xs text-white/30">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </p>

            {/* Friend request actions - only show if still pending */}
            {isFriendRequest && (notification.data?.friendshipId as string) && 
             (notification.data?.friendshipStatus === "PENDING" || !notification.data?.friendshipStatus) && (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)] hover:opacity-90 text-white border-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    respondToRequestMutation.mutate({
                      friendshipId: notification.data!.friendshipId as string,
                      accept: true,
                    });
                  }}
                  disabled={respondToRequestMutation.isPending}
                >
                  {respondToRequestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-4 w-4" />
                  )}
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    respondToRequestMutation.mutate({
                      friendshipId: notification.data!.friendshipId as string,
                      accept: false,
                    });
                  }}
                  disabled={respondToRequestMutation.isPending}
                >
                  <X className="mr-1 h-4 w-4" />
                  Decline
                </Button>
              </div>
            )}
            
            {/* Friend request - show accepted status */}
            {isFriendRequest && notification.data?.friendshipStatus === "ACCEPTED" && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-[var(--accent-teal)]">
                <Check className="h-4 w-4" />
                <span>Accepted</span>
              </div>
            )}

            {/* Join request link */}
            {isJoinRequest && notification.data && (notification.data.groupId as string) && (
              <Link 
                href={`/groups/${notification.data.groupId}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--accent-lilac)] hover:text-[var(--accent-violet)] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                View request
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            {/* Group invite link - deep link to pact for invited members */}
            {notification.type === "GROUP_INVITE" && notification.data && (notification.data.groupId as string) && (
              <Link 
                href={`/groups/${notification.data.groupId}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-gold)] hover:text-[var(--accent-gold)]/80 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Add your rule
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            {/* Pact member added - CTA to add rule and join */}
            {notification.type === "PACT_MEMBER_ADDED" && notification.data && (notification.data.groupId as string) && (
              <Link 
                href={`/groups/${notification.data.groupId}`}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-[var(--accent-gold)]/20 to-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30 hover:from-[var(--accent-gold)]/30 hover:to-[var(--accent-gold)]/20 transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                Join by adding your rule
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          {!notification.isRead && (
            <div className="h-2 w-2 rounded-full bg-[var(--accent-magenta)] animate-pulse" />
          )}
        </div>
      </div>
    );
  };

  const renderSection = (title: string, items: Notification[]) => {
    if (items.length === 0) return null;
    return (
      <section>
        <h2 className="mb-3 text-sm font-medium text-white/40">{title}</h2>
        <div className="space-y-3">{items.map(renderNotification)}</div>
      </section>
    );
  };

  return (
    <div className="min-h-screen space-y-6 px-4 py-6">
      {/* Header */}
      <div className="relative pt-6">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[var(--accent-violet)]/20 blur-[60px] rounded-full" />
        
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-white via-[var(--accent-lilac)] to-white bg-clip-text text-transparent">
                Activity
              </span>
            </h1>
            <p className="text-white/40">Your notifications</p>
          </div>
          {notifications && notifications.some((n) => !n.isRead) && (
            <Badge className="bg-[var(--accent-magenta)]/20 text-[var(--accent-magenta)] border-[var(--accent-magenta)]/30">
              {notifications.filter((n) => !n.isRead).length} new
            </Badge>
          )}
        </div>
      </div>

      {/* Settlements Quick Link */}
      <Link href="/settlements">
        <div 
          className={cn(
            "relative rounded-2xl overflow-hidden transition-all duration-300",
            "bg-gradient-to-r from-[var(--accent-violet)]/20 to-[var(--accent-magenta)]/20",
            "border border-[var(--accent-violet)]/30",
            "hover:border-[var(--accent-violet)]/50 hover:scale-[1.02]"
          )}
          style={{
            boxShadow: "0 8px 32px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        >
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-gold)]/20">
                <IndianRupee className="h-5 w-5 text-[var(--accent-gold)]" />
              </div>
              <div>
                <p className="font-medium text-white">Settlements</p>
                <p className="text-sm text-white/50">
                  Manage your payments
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-white/50" />
          </div>
        </div>
      </Link>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-lilac)]" />
        </div>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-6">
          {renderSection("Today", groupedNotifications.today)}
          {renderSection("This Week", groupedNotifications.thisWeek)}
          {renderSection("Earlier", groupedNotifications.earlier)}
        </div>
      ) : (
        <div 
          className={cn(
            "rounded-2xl overflow-hidden",
            "bg-[var(--dusk-2)]/60 backdrop-blur-xl",
            "border border-white/[0.06]"
          )}
        >
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--dusk-3)] flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-white/30" />
            </div>
            <p className="font-medium text-white/70">No notifications yet</p>
            <p className="text-sm text-white/40">
              You&apos;ll see friend requests, group updates, and more here
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
