"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  Loader2,
  Check,
  X,
  Clock,
  AlertTriangle,
  Users,
} from "lucide-react";

interface DeletionStatus {
  status: "NONE" | "PENDING" | "APPROVED" | "DECLINED" | "EXPIRED" | "DELETED";
  requestedBy: string | null;
  requestedAt: string | null;
  expiresAt: string | null;
  isCreator: boolean;
  hasVoted: boolean;
  myVote: "APPROVE" | "DECLINE" | null;
  approvedCount: number;
  totalMembers: number;
  approvedMembers: { id: string; name: string | null }[];
  pendingMembers: { id: string; name: string | null; avatarUrl: string | null }[];
}

interface PactDeletionProps {
  groupId: string;
  groupName: string;
  isCreator: boolean;
  currentUserId: string;
}

export function PactDeletion({ groupId, groupName, isCreator, currentUserId }: PactDeletionProps) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Fetch deletion status
  const { data: deletionStatus, isLoading } = useQuery<DeletionStatus>({
    queryKey: ["deletion-status", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/delete/status`);
      if (!res.ok) throw new Error("Failed to fetch deletion status");
      return res.json();
    },
    refetchInterval: 10000, // Poll every 10s when pending
  });

  // Request deletion mutation
  const requestDeletionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/delete/request`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "Failed to request deletion");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["deletion-status", groupId] });
      setConfirmOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (vote: "APPROVE" | "DECLINE") => {
      const res = await fetch(`/api/groups/${groupId}/delete/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "Failed to vote");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["deletion-status", groupId] });
      if (data.status === "DELETED") {
        // Redirect to home after deletion
        window.location.href = "/home";
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/delete/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "Failed to cancel");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Deletion cancelled");
      queryClient.invalidateQueries({ queryKey: ["deletion-status", groupId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  // No deletion in progress
  if (!deletionStatus || deletionStatus.status === "NONE" || deletionStatus.status === "DECLINED" || deletionStatus.status === "EXPIRED") {
    if (!isCreator) return null;

    return (
      <div className={cn(
        "p-4 rounded-2xl",
        "bg-red-500/5 border border-red-500/20"
      )}>
        <h4 className="text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </h4>
        <p className="text-xs text-slate-400 mb-3">
          Delete this pact permanently. All members must approve.
        </p>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Request Deletion
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-slate-900 border-slate-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete &quot;{groupName}&quot;?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                This will send a deletion request to all members. The pact will only be deleted if everyone approves.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => requestDeletionMutation.mutate()}
                disabled={requestDeletionMutation.isPending}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {requestDeletionMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Request Deletion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Deletion pending - show progress and voting UI
  if (deletionStatus.status === "PENDING") {
    const timeRemaining = deletionStatus.expiresAt
      ? Math.max(0, new Date(deletionStatus.expiresAt).getTime() - Date.now())
      : 0;
    const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));

    return (
      <div className={cn(
        "p-4 rounded-2xl space-y-4",
        "bg-amber-500/10 border border-amber-500/30"
      )}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-amber-300">Deletion Pending</h4>
            <p className="text-sm text-slate-400">
              {hoursRemaining > 0 ? `Expires in ${hoursRemaining}h` : "Expiring soon"}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-slate-400" />
          <span className="text-slate-300">
            {deletionStatus.approvedCount} of {deletionStatus.totalMembers} approved
          </span>
        </div>

        {/* Pending members */}
        {deletionStatus.pendingMembers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Waiting for:</p>
            <div className="flex flex-wrap gap-2">
              {deletionStatus.pendingMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-2 py-1 rounded-full bg-slate-800/50 text-sm"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs bg-slate-700">
                      {member.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-slate-300">{member.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vote buttons (if user hasn't voted and isn't the requester) */}
        {!deletionStatus.hasVoted && deletionStatus.requestedBy !== currentUserId && (
          <div className="flex gap-2">
            <Button
              onClick={() => voteMutation.mutate("APPROVE")}
              disabled={voteMutation.isPending}
              className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
            >
              {voteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
            <Button
              onClick={() => voteMutation.mutate("DECLINE")}
              disabled={voteMutation.isPending}
              variant="outline"
              className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              {voteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Decline
            </Button>
          </div>
        )}

        {/* Show user's vote if they've voted */}
        {deletionStatus.hasVoted && (
          <div className={cn(
            "p-2 rounded-lg text-sm text-center",
            deletionStatus.myVote === "APPROVE" 
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          )}>
            You voted to {deletionStatus.myVote?.toLowerCase()}
          </div>
        )}

        {/* Cancel button for creator */}
        {isCreator && (
          <Button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            variant="ghost"
            size="sm"
            className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {cancelMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Cancel Deletion Request
          </Button>
        )}
      </div>
    );
  }

  return null;
}
