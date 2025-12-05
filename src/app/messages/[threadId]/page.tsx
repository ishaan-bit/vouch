"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ChatBox } from "@/components/chat/chat-box";

interface DmPageProps {
  params: Promise<{ threadId: string }>;
}

export default function DmPage({ params }: DmPageProps) {
  const { threadId } = use(params);
  const router = useRouter();

  const { data: threads, isLoading } = useQuery({
    queryKey: ["dm-threads"],
    queryFn: async () => {
      const res = await fetch("/api/messages/dm");
      if (!res.ok) throw new Error("Failed to fetch threads");
      return res.json();
    },
  });

  const thread = threads?.find((t: { id: string }) => t.id === threadId);

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
          {thread && (
            <>
              <Avatar>
                <AvatarImage src={thread.otherUser.avatarUrl || undefined} />
                <AvatarFallback>
                  {thread.otherUser.name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="font-semibold">{thread.otherUser.name}</h1>
                <p className="text-sm text-muted-foreground">
                  @{thread.otherUser.username}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <ChatBox
          type="dm"
          id={threadId}
          recipientId={thread?.otherUser?.id}
        />
      </div>
    </div>
  );
}
