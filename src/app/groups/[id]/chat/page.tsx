"use client";

import { use } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Loader2, Video } from "lucide-react";
import { ChatBox } from "@/components/chat/chat-box";
import { toast } from "sonner";

interface GroupChatPageProps {
  params: Promise<{ id: string }>;
}

export default function GroupChatPage({ params }: GroupChatPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: group, isLoading } = useQuery({
    queryKey: ["group", id],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${id}`);
      if (!res.ok) throw new Error("Failed to fetch group");
      return res.json();
    },
  });

  // Start instant call mutation (P1 fix K)
  const startCallMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const res = await fetch(`/api/groups/${id}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Quick Call",
          scheduledFor: now.toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start call");
      }
      return res.json();
    },
    onSuccess: (call) => {
      // Navigate to the call page
      router.push(`/groups/${id}/call?callId=${call.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start call");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold">{group?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {group?.memberships?.length || 0} members
            </p>
          </div>
          {/* Start Call Button (P1 fix K) */}
          {group?.status === "ACTIVE" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => startCallMutation.mutate()}
              disabled={startCallMutation.isPending}
              className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
            >
              {startCallMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Video className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <ChatBox type="group" id={id} />
      </div>
    </div>
  );
}
