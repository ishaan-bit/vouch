"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Loader2 } from "lucide-react";
import { ChatBox } from "@/components/chat/chat-box";

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
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <ChatBox type="group" id={id} />
      </div>
    </div>
  );
}
