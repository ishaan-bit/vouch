"use client";

import { useQuery } from "@tanstack/react-query";

interface UnreadCounts {
  activity: number;
  messages: number;
}

export function useUnreadCounts() {
  return useQuery<UnreadCounts>({
    queryKey: ["unread-counts"],
    queryFn: async () => {
      const res = await fetch("/api/unread-counts");
      if (!res.ok) {
        // Return defaults if API fails
        return { activity: 0, messages: 0 };
      }
      return res.json();
    },
    // Refetch every 30 seconds
    refetchInterval: 30000,
    // Don't show loading states
    placeholderData: { activity: 0, messages: 0 },
  });
}
