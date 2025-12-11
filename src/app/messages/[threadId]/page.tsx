"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, MoreVertical, UserMinus, Ban, User, Flag } from "lucide-react";
import { ChatBox } from "@/components/chat/chat-box";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import Link from "next/link";
import { ReportDialog } from "@/components/reports/report-dialog";

interface DmPageProps {
  params: Promise<{ threadId: string }>;
}

export default function DmPage({ params }: DmPageProps) {
  const { threadId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const { data: threads, isLoading } = useQuery({
    queryKey: ["dm-threads"],
    queryFn: async () => {
      const res = await fetch("/api/messages/dm");
      if (!res.ok) throw new Error("Failed to fetch threads");
      return res.json();
    },
  });

  const thread = threads?.find((t: { id: string }) => t.id === threadId);

  const removeFriendMutation = useMutation({
    mutationFn: async () => {
      if (!thread?.friendshipId) throw new Error("No friendship found");
      const res = await fetch(`/api/friends/${thread.friendshipId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove friend");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dm-threads"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      toast.success("Friend removed");
      setShowRemoveDialog(false);
      router.push("/messages");
    },
    onError: () => {
      toast.error("Failed to remove friend");
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: thread?.otherUser?.id }),
      });
      if (!res.ok) throw new Error("Failed to block user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dm-threads"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      toast.success("User blocked");
      setShowBlockDialog(false);
      router.push("/messages");
    },
    onError: () => {
      toast.error("Failed to block user");
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
          {thread && (
            <>
              <Link href={`/profile/${thread.otherUser.username || thread.otherUser.id}`}>
                <Avatar>
                  <AvatarImage src={thread.otherUser.avatarUrl || undefined} />
                  <AvatarFallback>
                    {thread.otherUser.name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Link 
                href={`/profile/${thread.otherUser.username || thread.otherUser.id}`}
                className="flex-1"
              >
                <h1 className="font-semibold">{thread.otherUser.name}</h1>
                <p className="text-sm text-muted-foreground">
                  @{thread.otherUser.username}
                </p>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${thread.otherUser.username || thread.otherUser.id}`}>
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowReportDialog(true)}
                    className="text-orange-600"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Report User
                  </DropdownMenuItem>
                  {thread.friendshipId && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setShowRemoveDialog(true)}
                        className="text-orange-600"
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Remove Friend
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowBlockDialog(true)}
                    className="text-destructive"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Block User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

      {/* Remove Friend Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {thread?.otherUser?.name || "this user"} from your friends? 
              You can send another friend request later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeFriendMutation.mutate()}
              disabled={removeFriendMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {removeFriendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Remove Friend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block User Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block {thread?.otherUser?.name || "this user"}? 
              They won't be able to see your profile, send you messages, or add you as a friend.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => blockUserMutation.mutate()}
              disabled={blockUserMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {blockUserMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report User Dialog */}
      {thread?.otherUser && (
        <ReportDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          type="USER"
          targetId={thread.otherUser.id}
          targetName={thread.otherUser.name || thread.otherUser.username || undefined}
        />
      )}
    </div>
  );
}
