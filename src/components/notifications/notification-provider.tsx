"use client";

import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, Bell, Users, UserMinus, CheckCircle, AlertCircle } from "lucide-react";

interface Notification {
  id: string;
  type: string;
  message: string;
  data?: {
    threadId?: string;
    groupId?: string;
    senderId?: string;
    senderName?: string;
  };
  createdAt: string;
}

interface NotificationContextType {
  // Placeholder for future expansion
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotificationContext() {
  return useContext(NotificationContext);
}

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const lastCheckRef = useRef<Date>(new Date());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only poll when authenticated
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    const checkForNewNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications/live?since=${lastCheckRef.current.toISOString()}`);
        if (!res.ok) return;
        
        const data = await res.json();
        
        if (data.notifications && data.notifications.length > 0) {
          // Show toast for each new notification
          data.notifications.forEach((notification: Notification) => {
            showNotificationToast(notification);
          });

          // Invalidate relevant queries
          queryClient.invalidateQueries({ queryKey: ["unread-counts"] });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          
          // If it's a message notification, also invalidate DM threads
          if (data.notifications.some((n: Notification) => n.type === "NEW_DM" || n.type === "NEW_GROUP_MESSAGE")) {
            queryClient.invalidateQueries({ queryKey: ["dm-threads"] });
            queryClient.invalidateQueries({ queryKey: ["group-chat"] });
          }
        }

        lastCheckRef.current = new Date();
      } catch (error) {
        // Silently fail - don't spam errors
      }
    };

    const showNotificationToast = (notification: Notification) => {
      // Don't show toast if user is already on the relevant page
      if (pathname && notification.type === "NEW_DM" && pathname.includes(`/messages/${notification.data?.threadId}`)) {
        return;
      }
      if (pathname && notification.type === "NEW_GROUP_MESSAGE" && pathname.includes(`/groups/${notification.data?.groupId}`)) {
        return;
      }

      const icon = getNotificationIcon(notification.type);
      const action = getNotificationAction(notification);

      toast(notification.message, {
        icon,
        duration: 5000,
        action: action ? {
          label: "View",
          onClick: () => action(),
        } : undefined,
      });
    };

    const getNotificationIcon = (type: string) => {
      switch (type) {
        case "NEW_DM":
          return <MessageCircle className="h-4 w-4 text-blue-500" />;
        case "NEW_GROUP_MESSAGE":
          return <Users className="h-4 w-4 text-green-500" />;
        case "FRIEND_REQUEST":
          return <Users className="h-4 w-4 text-purple-500" />;
        case "MEMBER_LEFT":
          return <UserMinus className="h-4 w-4 text-orange-500" />;
        case "PROOF_SUBMITTED":
          return <CheckCircle className="h-4 w-4 text-green-500" />;
        case "PROOF_DEADLINE":
          return <AlertCircle className="h-4 w-4 text-orange-500" />;
        default:
          return <Bell className="h-4 w-4 text-muted-foreground" />;
      }
    };

    const getNotificationAction = (notification: Notification) => {
      switch (notification.type) {
        case "NEW_DM":
          return notification.data?.threadId 
            ? () => router.push(`/messages/${notification.data?.threadId}`)
            : undefined;
        case "NEW_GROUP_MESSAGE":
          return notification.data?.groupId 
            ? () => router.push(`/groups/${notification.data?.groupId}`)
            : undefined;
        case "MEMBER_LEFT":
          return notification.data?.groupId 
            ? () => router.push(`/groups/${notification.data?.groupId}`)
            : () => router.push("/activity");
        case "FRIEND_REQUEST":
          return () => router.push("/activity");
        default:
          return () => router.push("/activity");
      }
    };

    // Initial check
    checkForNewNotifications();

    // Poll every 10 seconds
    pollIntervalRef.current = setInterval(checkForNewNotifications, 10000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [status, session?.user?.id, queryClient, pathname, router]);

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
}
