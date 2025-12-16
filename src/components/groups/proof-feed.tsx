"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, FileText, Link as LinkIcon, Mic, Video, Flame, ThumbsUp, Skull, Trash2, Loader2, MessageCircle, Send, ChevronDown, ChevronUp } from "lucide-react";
import { ProofMediaViewer } from "./proof-media-viewer";
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
} from "@/components/ui/alert-dialog";

interface GroupMember {
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

interface ProofRule {
  rule: {
    id: string;
    description: string;
  };
}

interface ProofReaction {
  emoji: string;
  userId: string;
}

interface ProofComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

interface Proof {
  id: string;
  uploaderId: string;
  dayIndex: number;
  caption: string | null;
  mediaType: "IMAGE" | "VIDEO" | "AUDIO" | "TEXT" | "LINK";
  mediaUrl: string | null;
  textContent: string | null;
  createdAt: string;
  uploader: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  ruleLinks: ProofRule[];
  reactions: ProofReaction[];
  comments?: ProofComment[];
}

interface ProofFeedProps {
  groupId: string;
  dayIndex: number;
  members: GroupMember[];
  currentUserId: string;
}

const mediaTypeIcons = {
  IMAGE: Camera,
  VIDEO: Video,
  AUDIO: Mic,
  TEXT: FileText,
  LINK: LinkIcon,
};

const reactionEmojis = [
  { emoji: "🔥", icon: Flame, label: "Fire" },
  { emoji: "👏", icon: ThumbsUp, label: "Clap" },
  { emoji: "💀", icon: Skull, label: "Dead" },
];

export function ProofFeed({ groupId, dayIndex, members, currentUserId }: ProofFeedProps) {
  const queryClient = useQueryClient();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<{
    url: string;
    type: "IMAGE" | "VIDEO" | "AUDIO";
    caption?: string | null;
    uploaderName?: string;
  } | null>(null);
  const [deleteProofId, setDeleteProofId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const { data: proofs, isLoading } = useQuery<Proof[]>({
    queryKey: ["proofs", groupId, dayIndex],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/proofs?day=${dayIndex}`);
      if (!res.ok) throw new Error("Failed to fetch proofs");
      return res.json();
    },
  });

  // Delete proof mutation
  const deleteProofMutation = useMutation({
    mutationFn: async (proofId: string) => {
      const res = await fetch(`/api/proofs/${proofId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete proof");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Proof deleted");
      queryClient.invalidateQueries({ queryKey: ["proofs", groupId] });
      setDeleteProofId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle reaction mutation
  const toggleReactionMutation = useMutation({
    mutationFn: async ({ proofId, emoji }: { proofId: string; emoji: string }) => {
      const res = await fetch(`/api/proofs/${proofId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to toggle reaction");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proofs", groupId, dayIndex] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ proofId, content }: { proofId: string; content: string }) => {
      const res = await fetch(`/api/proofs/${proofId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add comment");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Clear input and expand comments
      setCommentInputs((prev) => ({ ...prev, [variables.proofId]: "" }));
      setExpandedComments((prev) => new Set(prev).add(variables.proofId));
      queryClient.invalidateQueries({ queryKey: ["proofs", groupId, dayIndex] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async ({ proofId, commentId }: { proofId: string; commentId: string }) => {
      const res = await fetch(`/api/proofs/${proofId}/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete comment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proofs", groupId, dayIndex] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Toggle comment expansion
  const toggleComments = (proofId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(proofId)) {
        next.delete(proofId);
      } else {
        next.add(proofId);
      }
      return next;
    });
  };

  // Handle comment submission
  const handleSubmitComment = (proofId: string) => {
    const content = commentInputs[proofId]?.trim();
    if (!content) return;
    addCommentMutation.mutate({ proofId, content });
  };

  // Group proofs by member
  const proofsByMember = members.map((member) => ({
    member,
    proofs: proofs?.filter((p) => p.uploaderId === member.user.id) || [],
  }));

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {proofsByMember.map(({ member, proofs }) => (
        <Card key={member.user.id}>
          <CardContent className="py-4">
            {/* Member Header */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.user.avatarUrl || undefined} />
                <AvatarFallback>{member.user.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <span className="font-medium">{member.user.name}</span>
                <p className="text-sm text-muted-foreground">
                  {proofs.length} proof{proofs.length !== 1 ? "s" : ""} for Day {dayIndex}
                </p>
              </div>
              {proofs.length > 0 ? (
                <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                  ✓ Posted
                </Badge>
              ) : (
                <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                  Pending
                </Badge>
              )}
            </div>

            {/* Proofs */}
            {proofs.length > 0 ? (
              <div className="space-y-3">
                {proofs.map((proof) => {
                  const MediaIcon = mediaTypeIcons[proof.mediaType];
                  return (
                    <div
                      key={proof.id}
                      className="rounded-lg border bg-secondary/30 p-3"
                    >
                      {/* Media Preview */}
                      {proof.mediaUrl && proof.mediaType === "IMAGE" && (
                        <div 
                          className="mb-3 overflow-hidden rounded-lg cursor-pointer"
                          onClick={() => {
                            setViewerMedia({
                              url: proof.mediaUrl!,
                              type: "IMAGE",
                              caption: proof.caption,
                              uploaderName: member.user.name || undefined,
                            });
                            setViewerOpen(true);
                          }}
                        >
                          <img
                            src={proof.mediaUrl}
                            alt="Proof"
                            className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                          />
                        </div>
                      )}
                      {proof.mediaUrl && proof.mediaType === "VIDEO" && (
                        <div 
                          className="mb-3 overflow-hidden rounded-lg cursor-pointer relative group"
                          onClick={() => {
                            setViewerMedia({
                              url: proof.mediaUrl!,
                              type: "VIDEO",
                              caption: proof.caption,
                              uploaderName: member.user.name || undefined,
                            });
                            setViewerOpen(true);
                          }}
                        >
                          <video
                            src={proof.mediaUrl}
                            className="w-full h-48 object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                              <Video className="h-6 w-6 text-gray-700" />
                            </div>
                          </div>
                        </div>
                      )}
                      {proof.mediaUrl && proof.mediaType === "AUDIO" && (
                        <div 
                          className="mb-3 overflow-hidden rounded-lg cursor-pointer bg-gradient-to-r from-violet-500/20 to-purple-500/20 p-4 flex items-center gap-3 hover:from-violet-500/30 hover:to-purple-500/30 transition-colors"
                          onClick={() => {
                            setViewerMedia({
                              url: proof.mediaUrl!,
                              type: "AUDIO",
                              caption: proof.caption,
                              uploaderName: member.user.name || undefined,
                            });
                            setViewerOpen(true);
                          }}
                        >
                          <div className="w-10 h-10 rounded-full bg-violet-500/30 flex items-center justify-center">
                            <Mic className="h-5 w-5 text-violet-600" />
                          </div>
                          <span className="text-sm text-muted-foreground">Voice proof - tap to listen</span>
                        </div>
                      )}
                      {proof.textContent && (
                        <p className="mb-3 text-sm italic bg-background/50 p-3 rounded-lg">
                          &ldquo;{proof.textContent}&rdquo;
                        </p>
                      )}

                      {/* Caption */}
                      {proof.caption && (
                        <p className="text-sm mb-2">{proof.caption}</p>
                      )}

                      {/* Rules Tagged */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {proof.ruleLinks.map((link) => (
                          <Badge key={link.rule.id} variant="outline" className="text-xs">
                            {link.rule.description.substring(0, 20)}
                            {link.rule.description.length > 20 ? "..." : ""}
                          </Badge>
                        ))}
                      </div>

                      {/* Reactions */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        {reactionEmojis.map(({ emoji, label }) => {
                          const count = proof.reactions.filter((r) => r.emoji === emoji).length;
                          const hasReacted = proof.reactions.some(
                            (r) => r.emoji === emoji && r.userId === currentUserId
                          );
                          return (
                            <Button
                              key={emoji}
                              variant={hasReacted ? "secondary" : "ghost"}
                              size="sm"
                              className={`h-8 gap-1 ${hasReacted ? "bg-violet-500/20 border-violet-500/30" : ""}`}
                              onClick={() => toggleReactionMutation.mutate({ proofId: proof.id, emoji })}
                              disabled={toggleReactionMutation.isPending}
                            >
                              <span>{emoji}</span>
                              {count > 0 && (
                                <span className="text-xs">{count}</span>
                              )}
                            </Button>
                          );
                        })}
                        
                        {/* Comment button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1"
                          onClick={() => toggleComments(proof.id)}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {(proof.comments?.length || 0) > 0 && (
                            <span className="text-xs">{proof.comments?.length}</span>
                          )}
                          {expandedComments.has(proof.id) ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                        
                        {/* Delete button (owner only) */}
                        {proof.uploaderId === currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 ml-auto text-red-400 hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => setDeleteProofId(proof.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      {/* Comments section */}
                      {expandedComments.has(proof.id) && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          {/* Existing comments */}
                          {proof.comments && proof.comments.length > 0 && (
                            <div className="space-y-2">
                              {proof.comments.map((comment) => (
                                <div key={comment.id} className="flex gap-2 group">
                                  <Avatar className="h-6 w-6 flex-shrink-0">
                                    <AvatarImage src={comment.author.avatarUrl || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {comment.author.name?.[0] || "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-xs font-medium">{comment.author.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(comment.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="text-sm break-words">{comment.content}</p>
                                  </div>
                                  {comment.author.id === currentUserId && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500"
                                      onClick={() => deleteCommentMutation.mutate({ proofId: proof.id, commentId: comment.id })}
                                      disabled={deleteCommentMutation.isPending}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Add comment input */}
                          <div className="flex gap-2">
                            <Input
                              value={commentInputs[proof.id] || ""}
                              onChange={(e) => setCommentInputs((prev) => ({ ...prev, [proof.id]: e.target.value }))}
                              placeholder="Add a comment..."
                              className="flex-1 h-8 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSubmitComment(proof.id);
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-8"
                              onClick={() => handleSubmitComment(proof.id)}
                              disabled={!commentInputs[proof.id]?.trim() || addCommentMutation.isPending}
                            >
                              {addCommentMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No proofs uploaded yet for this day
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Proof Media Viewer Modal */}
      {viewerMedia && (
        <ProofMediaViewer
          open={viewerOpen}
          onOpenChange={(open) => {
            setViewerOpen(open);
            if (!open) setViewerMedia(null);
          }}
          mediaUrl={viewerMedia.url}
          mediaType={viewerMedia.type}
          caption={viewerMedia.caption}
          uploaderName={viewerMedia.uploaderName}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProofId} onOpenChange={(open: boolean) => !open && setDeleteProofId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proof?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This proof will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteProofId && deleteProofMutation.mutate(deleteProofId)}
              disabled={deleteProofMutation.isPending}
            >
              {deleteProofMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
