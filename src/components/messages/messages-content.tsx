"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { MessageCircle, Users, Loader2, Plus, UserPlus, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MessagesContentProps {
  userId: string;
}

interface DmThread {
  id: string;
  otherUser: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  lastMessage: {
    content: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface GroupChat {
  id: string;
  name: string;
  lastMessage: {
    content: string;
    senderName: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  memberCount: number;
  memberAvatars: string[];
}

interface Friend {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export function MessagesContent({ userId }: MessagesContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newChatOpen, setNewChatOpen] = useState(false);

  const { data: dmThreads, isLoading: dmLoading } = useQuery<DmThread[]>({
    queryKey: ["dm-threads"],
    queryFn: async () => {
      const res = await fetch("/api/messages/dm");
      if (!res.ok) return [];
      return res.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const { data: groupChats, isLoading: groupLoading } = useQuery<GroupChat[]>({
    queryKey: ["group-chats"],
    queryFn: async () => {
      const res = await fetch("/api/messages/groups");
      if (!res.ok) return [];
      return res.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  // Fetch friends for new conversation
  const { data: friends, isLoading: friendsLoading } = useQuery<Friend[]>({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch("/api/friends");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
  });

  // Mutation to start or find existing DM thread
  const startDmMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const res = await fetch("/api/messages/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: friendId }),
      });
      if (!res.ok) throw new Error("Failed to start conversation");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["dm-threads"] });
      setNewChatOpen(false);
      router.push(`/messages/${data.id}`);
    },
    onError: () => {
      toast.error("Failed to start conversation");
    },
  });

  // Filter friends who don't have existing DM threads
  const friendsWithoutThread = friends?.filter(
    (friend) => !dmThreads?.some((thread) => thread.otherUser.id === friend.id)
  ) || [];

  return (
    <div className="min-h-screen space-y-4 px-4 py-6">
      {/* Header */}
      <div className="relative pt-6">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[var(--accent-violet)]/20 blur-[60px] rounded-full" />
        
        <div className="relative flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-white via-[var(--accent-lilac)] to-white bg-clip-text text-transparent">
                Messages
              </span>
            </h1>
            <p className="text-white/40">Chat with friends and groups</p>
          </div>
          
          {/* New Conversation Button */}
          <Button
            onClick={() => setNewChatOpen(true)}
            size="icon"
            className={cn(
              "rounded-xl h-10 w-10",
              "bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)]",
              "hover:opacity-90 transition-opacity"
            )}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* New Conversation Dialog */}
      <BottomSheet open={newChatOpen} onOpenChange={setNewChatOpen}>
        <BottomSheetContent className={cn(
          "bg-[var(--dusk-1)] border-white/[0.06]"
        )}>
          <BottomSheetHeader>
            <BottomSheetTitle className="text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[var(--accent-lilac)]" />
              Start a Conversation
            </BottomSheetTitle>
          </BottomSheetHeader>
          
          <div className="space-y-3 mt-4">
            {friendsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-lilac)]" />
              </div>
            ) : friends && friends.length > 0 ? (
              <>
                {friendsWithoutThread.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider px-1">
                      Start New Chat
                    </p>
                    {friendsWithoutThread.map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => startDmMutation.mutate(friend.id)}
                        disabled={startDmMutation.isPending}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                          "bg-[var(--dusk-2)]/60 hover:bg-[var(--dusk-2)]",
                          "border border-white/[0.06] hover:border-white/[0.1]"
                        )}
                      >
                        <Avatar className="h-10 w-10 border-2 border-white/10">
                          <AvatarImage src={friend.avatarUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white">
                            {friend.name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-white">{friend.name || "Unknown"}</p>
                          <p className="text-sm text-white/40">@{friend.username || "user"}</p>
                        </div>
                        <MessageCircle className="h-5 w-5 text-[var(--accent-lilac)]" />
                      </button>
                    ))}
                  </div>
                )}
                
                {dmThreads && dmThreads.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider px-1">
                      Existing Conversations
                    </p>
                    {dmThreads.map((thread) => (
                      <Link
                        key={thread.id}
                        href={`/messages/${thread.id}`}
                        onClick={() => setNewChatOpen(false)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-all",
                          "bg-[var(--dusk-2)]/40 hover:bg-[var(--dusk-2)]/60",
                          "border border-white/[0.04] hover:border-white/[0.08]"
                        )}
                      >
                        <Avatar className="h-10 w-10 border-2 border-white/10">
                          <AvatarImage src={thread.otherUser.avatarUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white">
                            {thread.otherUser.name?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-white">{thread.otherUser.name}</p>
                          <p className="text-sm text-white/40">@{thread.otherUser.username}</p>
                        </div>
                        {thread.unreadCount > 0 && (
                          <Badge className="bg-[var(--accent-magenta)] text-white">
                            {thread.unreadCount}
                          </Badge>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
                
                {friendsWithoutThread.length === 0 && (!dmThreads || dmThreads.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-[var(--dusk-3)] flex items-center justify-center mb-3">
                      <MessageCircle className="h-6 w-6 text-white/30" />
                    </div>
                    <p className="text-white/50 text-sm">All friends have active chats</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--dusk-3)] flex items-center justify-center mb-3">
                  <UserPlus className="h-6 w-6 text-white/30" />
                </div>
                <p className="text-white/70 font-medium">No friends yet</p>
                <p className="text-white/40 text-sm mt-1">
                  Add friends from the Discover page to start chatting
                </p>
                <Link href="/discover" onClick={() => setNewChatOpen(false)}>
                  <Button 
                    variant="ghost" 
                    className="mt-4 text-[var(--accent-lilac)] hover:text-[var(--accent-lilac)] hover:bg-[var(--accent-lilac)]/10 min-h-[44px] touch-action-manipulation"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Find Friends
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </BottomSheetContent>
      </BottomSheet>

      <Tabs defaultValue="direct" className="w-full">
        <TabsList className={cn(
          "grid w-full grid-cols-2 h-12 p-1 rounded-2xl",
          "bg-[var(--dusk-2)]/60 backdrop-blur-xl",
          "border border-white/[0.06]"
        )}>
          <TabsTrigger 
            value="direct" 
            className={cn(
              "gap-2 rounded-xl text-sm font-medium transition-all duration-300",
              "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60",
              "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--accent-violet)] data-[state=active]:to-[var(--accent-magenta)]",
              "data-[state=active]:text-white data-[state=active]:shadow-lg"
            )}
          >
            <MessageCircle className="h-4 w-4" />
            Direct
          </TabsTrigger>
          <TabsTrigger 
            value="groups" 
            className={cn(
              "gap-2 rounded-xl text-sm font-medium transition-all duration-300",
              "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60",
              "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--accent-violet)] data-[state=active]:to-[var(--accent-magenta)]",
              "data-[state=active]:text-white data-[state=active]:shadow-lg"
            )}
          >
            <Users className="h-4 w-4" />
            Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="mt-4 space-y-3">
          {dmLoading || friendsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-lilac)]" />
            </div>
          ) : (
            <>
              {/* Existing DM threads */}
              {dmThreads && dmThreads.length > 0 && dmThreads.map((thread) => (
                <Link key={thread.id} href={`/messages/${thread.id}`}>
                  <div 
                    className={cn(
                      "relative flex items-center gap-3 p-4 rounded-2xl transition-all duration-300",
                      "bg-[var(--dusk-2)]/60 backdrop-blur-xl",
                      "border border-white/[0.06]",
                      "hover:bg-[var(--dusk-2)]/80 hover:border-white/[0.1]"
                    )}
                    style={{
                      boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
                    }}
                  >
                    <div className="relative">
                      <Avatar className="border-2 border-white/10">
                        <AvatarImage src={thread.otherUser.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white">
                          {thread.otherUser.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      {thread.unreadCount > 0 && (
                        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-magenta)] text-[10px] text-white font-medium">
                          {thread.unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-white">{thread.otherUser.name}</p>
                        {thread.lastMessage && (
                          <span className="text-xs text-white/30">
                            {formatDistanceToNow(new Date(thread.lastMessage.createdAt), {
                              addSuffix: false,
                            })}
                          </span>
                        )}
                      </div>
                      {thread.lastMessage ? (
                        <p className="text-sm text-white/50 truncate">
                          {thread.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-sm text-white/30">No messages yet</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              
              {/* Friends without existing threads - shown inline */}
              {friendsWithoutThread.length > 0 && (
                <div className="space-y-2">
                  {dmThreads && dmThreads.length > 0 && (
                    <p className="text-xs text-white/40 uppercase tracking-wider px-1 mt-4">
                      Start a conversation
                    </p>
                  )}
                  {friendsWithoutThread.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => startDmMutation.mutate(friend.id)}
                      disabled={startDmMutation.isPending}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-300",
                        "bg-[var(--dusk-2)]/40 backdrop-blur-xl",
                        "border border-white/[0.04] border-dashed",
                        "hover:bg-[var(--dusk-2)]/60 hover:border-white/[0.1]"
                      )}
                    >
                      <Avatar className="border-2 border-white/10">
                        <AvatarImage src={friend.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)]/50 to-[var(--accent-magenta)]/50 text-white">
                          {friend.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-white/80">{friend.name || "Unknown"}</p>
                        <p className="text-sm text-white/40">@{friend.username || "user"}</p>
                      </div>
                      <MessageCircle className="h-5 w-5 text-[var(--accent-lilac)]/60" />
                    </button>
                  ))}
                </div>
              )}
              
              {/* Empty state - no threads AND no friends */}
              {(!dmThreads || dmThreads.length === 0) && friendsWithoutThread.length === 0 && (
                <div 
                  className={cn(
                    "rounded-2xl overflow-hidden",
                    "bg-[var(--dusk-2)]/60 backdrop-blur-xl",
                    "border border-white/[0.06]"
                  )}
                >
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--dusk-3)] flex items-center justify-center mb-4">
                      <MessageCircle className="h-8 w-8 text-white/30" />
                    </div>
                    <p className="font-medium text-white/70">No conversations yet</p>
                    <p className="text-sm text-white/40">
                      Add friends from Discover to start chatting
                    </p>
                    <Link href="/discover">
                      <Button 
                        variant="ghost" 
                        className="mt-4 text-[var(--accent-lilac)] hover:text-[var(--accent-lilac)] hover:bg-[var(--accent-lilac)]/10"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Find Friends
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="groups" className="mt-4 space-y-3">
          {groupLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-lilac)]" />
            </div>
          ) : groupChats && groupChats.length > 0 ? (
            groupChats.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}?tab=chat`}>
                <div 
                  className={cn(
                    "relative flex items-center gap-3 p-4 rounded-2xl transition-all duration-300",
                    "bg-[var(--dusk-2)]/60 backdrop-blur-xl",
                    "border border-white/[0.06]",
                    "hover:bg-[var(--dusk-2)]/80 hover:border-white/[0.1]"
                  )}
                  style={{
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="relative flex -space-x-2">
                    {group.memberAvatars.slice(0, 3).map((avatar, i) => (
                      <Avatar key={i} className="h-8 w-8 border-2 border-[var(--dusk-2)]">
                        <AvatarImage src={avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white text-xs">
                          ?
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {group.unreadCount > 0 && (
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-magenta)] text-[10px] text-white font-medium">
                        {group.unreadCount}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{group.name}</p>
                        <span className="text-xs text-white/40 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {group.memberCount}
                        </span>
                      </div>
                      {group.lastMessage && (
                        <span className="text-xs text-white/30">
                          {formatDistanceToNow(new Date(group.lastMessage.createdAt), {
                            addSuffix: false,
                          })}
                        </span>
                      )}
                    </div>
                    {group.lastMessage ? (
                      <p className="text-sm text-white/50 truncate">
                        <span className="font-medium text-[var(--accent-lilac)]">{group.lastMessage.senderName}:</span>{" "}
                        {group.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-sm text-white/30">No messages yet</p>
                    )}
                  </div>
                </div>
              </Link>
            ))
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
                  <Users className="h-8 w-8 text-white/30" />
                </div>
                <p className="font-medium text-white/70">No group chats</p>
                <p className="text-sm text-white/40">
                  Join a group to start chatting
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
