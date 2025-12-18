"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, FileText, Link as LinkIcon, Mic, Video, Flame, ThumbsUp, Skull, Trash2, Loader2, MessageCircle, Send, ChevronDown, ChevronUp, Filter, SortAsc, Calendar, User } from "lucide-react";
import { ProofMediaViewer } from "./proof-media-viewer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

// Helper to format date only on client to avoid hydration mismatch
function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return "";
  }
}

function formatTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return "";
  }
}

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
  durationDays?: number;
  startDate?: Date | string | null;
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

export function ProofFeed({ groupId, dayIndex: initialDayIndex, members, currentUserId, durationDays = 7, startDate }: ProofFeedProps) {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<{
    url: string;
    type: "IMAGE" | "VIDEO" | "AUDIO";
    caption?: string | null;
    uploaderName?: string;
  } | null>(null);

  // Prevent hydration mismatch by only rendering dates after mount
  useEffect(() => {
    setMounted(true);
  }, []);
  const [deleteProofId, setDeleteProofId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  
  // Filter states - default to "all" so users see all proofs initially
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");
  const [selectedUser, setSelectedUser] = useState<string | "all">("all");
  const [selectedMediaType, setSelectedMediaType] = useState<string | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const { data: proofs, isLoading } = useQuery<Proof[]>({
    queryKey: ["proofs", groupId, selectedDay],
    queryFn: async () => {
      const url = selectedDay === "all" 
        ? `/api/groups/${groupId}/proofs`
        : `/api/groups/${groupId}/proofs?day=${selectedDay}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch proofs");
      return res.json();
    },
  });

  // Filter and sort proofs
  const filteredProofs = useMemo(() => {
    if (!proofs) return [];
    
    let filtered = [...proofs];
    
    // Filter by user
    if (selectedUser !== "all") {
      filtered = filtered.filter(p => p.uploaderId === selectedUser);
    }
    
    // Filter by media type
    if (selectedMediaType !== "all") {
      filtered = filtered.filter(p => p.mediaType === selectedMediaType);
    }
    
    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
  }, [proofs, selectedUser, selectedMediaType, sortOrder]);

  // Group proofs by day and user for display
  const groupedProofs = useMemo(() => {
    const grouped: Record<number, Record<string, Proof[]>> = {};
    
    filteredProofs.forEach(proof => {
      if (!grouped[proof.dayIndex]) {
        grouped[proof.dayIndex] = {};
      }
      if (!grouped[proof.dayIndex][proof.uploaderId]) {
        grouped[proof.dayIndex][proof.uploaderId] = [];
      }
      grouped[proof.dayIndex][proof.uploaderId].push(proof);
    });
    
    return grouped;
  }, [filteredProofs]);

  // Delete proof mutation

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
      queryClient.invalidateQueries({ queryKey: ["proofs", groupId, selectedDay] });
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
      queryClient.invalidateQueries({ queryKey: ["proofs", groupId, selectedDay] });
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
      queryClient.invalidateQueries({ queryKey: ["proofs", groupId, selectedDay] });
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

  // Generate day options
  const dayOptions = Array.from({ length: durationDays }, (_, i) => i + 1);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-[var(--dusk-2)]/60 h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <div className={cn(
        "p-4 rounded-2xl space-y-3",
        "bg-[var(--dusk-2)]/40 border border-white/[0.06]"
      )}>
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Filter className="w-4 h-4" />
          <span>Filter Proofs</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {/* Day Filter */}
          <Select value={String(selectedDay)} onValueChange={(v) => setSelectedDay(v === "all" ? "all" : parseInt(v))}>
            <SelectTrigger className="bg-[var(--dusk-3)]/60 border-white/10 text-white">
              <Calendar className="w-4 h-4 mr-2 text-white/40" />
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--dusk-2)] border-white/10">
              <SelectItem value="all" className="text-white">All Days</SelectItem>
              {dayOptions.map((day) => (
                <SelectItem key={day} value={String(day)} className="text-white">
                  Day {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* User Filter */}
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="bg-[var(--dusk-3)]/60 border-white/10 text-white">
              <User className="w-4 h-4 mr-2 text-white/40" />
              <SelectValue placeholder="Member" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--dusk-2)] border-white/10">
              <SelectItem value="all" className="text-white">All Members</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.user.id} value={m.user.id} className="text-white">
                  {m.user.name?.split(" ")[0] || "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Media Type Filter */}
          <Select value={selectedMediaType} onValueChange={setSelectedMediaType}>
            <SelectTrigger className="bg-[var(--dusk-3)]/60 border-white/10 text-white">
              <Camera className="w-4 h-4 mr-2 text-white/40" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--dusk-2)] border-white/10">
              <SelectItem value="all" className="text-white">All Types</SelectItem>
              <SelectItem value="IMAGE" className="text-white">📷 Image</SelectItem>
              <SelectItem value="VIDEO" className="text-white">🎥 Video</SelectItem>
              <SelectItem value="AUDIO" className="text-white">🎤 Audio</SelectItem>
              <SelectItem value="TEXT" className="text-white">📝 Text</SelectItem>
              <SelectItem value="LINK" className="text-white">🔗 Link</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Order */}
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "newest" | "oldest")}>
            <SelectTrigger className="bg-[var(--dusk-3)]/60 border-white/10 text-white">
              <SortAsc className="w-4 h-4 mr-2 text-white/40" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--dusk-2)] border-white/10">
              <SelectItem value="newest" className="text-white">Newest First</SelectItem>
              <SelectItem value="oldest" className="text-white">Oldest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-xs text-white/40">
          {filteredProofs.length} proof{filteredProofs.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Proofs List */}
      {filteredProofs.length === 0 ? (
        <div className={cn(
          "p-8 rounded-2xl text-center",
          "bg-[var(--dusk-2)]/40 border border-white/[0.06]"
        )}>
          <Camera className="w-12 h-12 mx-auto text-white/20 mb-3" />
          <p className="text-white/50">No proofs yet</p>
          <p className="text-sm text-white/30 mt-1">
            {selectedDay === "all" ? "Be the first to post a proof!" : `No proofs for Day ${selectedDay}`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProofs.map((proof) => {
            const MediaIcon = mediaTypeIcons[proof.mediaType];
            const member = members.find(m => m.user.id === proof.uploaderId);
            
            return (
              <div
                key={proof.id}
                className={cn(
                  "rounded-2xl overflow-hidden",
                  "bg-[var(--dusk-2)]/60 border border-white/[0.06]"
                )}
              >
                {/* Member Header */}
                <div className="flex items-center gap-3 p-4 border-b border-white/[0.04]">
                  <Avatar className="h-10 w-10 border border-white/10">
                    <AvatarImage src={proof.uploader.avatarUrl || undefined} />
                    <AvatarFallback className="bg-[var(--accent-violet)]/20 text-white">
                      {proof.uploader.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">{proof.uploader.name}</span>
                      <Badge className="bg-[var(--accent-violet)]/20 text-[var(--accent-lilac)] border-0 text-[10px]">
                        Day {proof.dayIndex}
                      </Badge>
                    </div>
                    <p className="text-xs text-white/40">
                      {mounted ? `${formatDate(proof.createdAt)} at ${formatTime(proof.createdAt)}` : "Loading..."}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.05] text-white/50">
                    <MediaIcon className="w-3.5 h-3.5" />
                    <span className="text-xs">{proof.mediaType}</span>
                  </div>
                  {proof.uploaderId === currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => setDeleteProofId(proof.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Media Preview */}
                <div className="p-4 pt-0">
                  {proof.mediaUrl && proof.mediaType === "IMAGE" && (
                    <div 
                      className="mt-4 overflow-hidden rounded-xl cursor-pointer"
                      onClick={() => {
                        setViewerMedia({
                          url: proof.mediaUrl!,
                          type: "IMAGE",
                          caption: proof.caption,
                          uploaderName: proof.uploader.name || undefined,
                        });
                        setViewerOpen(true);
                      }}
                    >
                      <img
                        src={proof.mediaUrl}
                        alt="Proof"
                        className="w-full max-h-80 object-cover hover:opacity-90 transition-opacity"
                      />
                    </div>
                  )}
                  
                  {proof.mediaUrl && proof.mediaType === "VIDEO" && (
                    <div className="mt-4 overflow-hidden rounded-xl">
                      <video
                        src={proof.mediaUrl}
                        controls
                        className="w-full max-h-80 object-cover"
                      />
                    </div>
                  )}
                  
                  {proof.mediaUrl && proof.mediaType === "AUDIO" && (
                    <div className="mt-4 p-4 rounded-xl bg-white/[0.03]">
                      <audio src={proof.mediaUrl} controls className="w-full" />
                    </div>
                  )}
                  
                  {proof.mediaType === "TEXT" && proof.textContent && (
                    <div className="mt-4 p-4 rounded-xl bg-white/[0.03] text-white/80 whitespace-pre-wrap">
                      {proof.textContent}
                    </div>
                  )}
                  
                  {proof.mediaType === "LINK" && proof.mediaUrl && (
                    <div className="mt-4 p-4 rounded-xl bg-white/[0.03]">
                      <a 
                        href={proof.mediaUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[var(--accent-teal)] hover:underline flex items-center gap-2"
                      >
                        <LinkIcon className="w-4 h-4" />
                        {proof.mediaUrl}
                      </a>
                    </div>
                  )}

                  {/* Caption */}
                  {proof.caption && (
                    <p className="mt-3 text-sm text-white/70">{proof.caption}</p>
                  )}

                  {/* Reactions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.04]">
                    {reactionEmojis.map(({ emoji, label }) => {
                      const count = proof.reactions.filter((r) => r.emoji === emoji).length;
                      const hasReacted = proof.reactions.some(
                        (r) => r.emoji === emoji && r.userId === currentUserId
                      );
                      return (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-8 px-3 rounded-full",
                            hasReacted 
                              ? "bg-[var(--accent-violet)]/20 text-[var(--accent-lilac)]" 
                              : "bg-white/[0.05] text-white/60 hover:bg-white/[0.1]"
                          )}
                          onClick={() => toggleReactionMutation.mutate({ proofId: proof.id, emoji })}
                        >
                          <span className="mr-1">{emoji}</span>
                          {count > 0 && <span className="text-xs">{count}</span>}
                        </Button>
                      );
                    })}
                    
                    {/* Comments Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 rounded-full bg-white/[0.05] text-white/60 hover:bg-white/[0.1] ml-auto"
                      onClick={() => toggleComments(proof.id)}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      {proof.comments?.length || 0}
                      {expandedComments.has(proof.id) ? (
                        <ChevronUp className="w-3 h-3 ml-1" />
                      ) : (
                        <ChevronDown className="w-3 h-3 ml-1" />
                      )}
                    </Button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments.has(proof.id) && (
                    <div className="mt-3 space-y-3">
                      {proof.comments && proof.comments.length > 0 && (
                        <div className="space-y-2">
                          {proof.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-2 p-2 rounded-lg bg-white/[0.03]">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={comment.author.avatarUrl || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {comment.author.name?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-white/80">
                                    {comment.author.name?.split(" ")[0]}
                                  </span>
                                  <span className="text-[10px] text-white/30">
                                    {mounted ? formatTime(comment.createdAt) : ""}
                                  </span>
                                </div>
                                <p className="text-sm text-white/60">{comment.content}</p>
                              </div>
                              {comment.author.id === currentUserId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-white/30 hover:text-red-400"
                                  onClick={() => deleteCommentMutation.mutate({ 
                                    proofId: proof.id, 
                                    commentId: comment.id 
                                  })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Add Comment Input */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Write a comment..."
                          value={commentInputs[proof.id] || ""}
                          onChange={(e) => setCommentInputs((prev) => ({ 
                            ...prev, 
                            [proof.id]: e.target.value 
                          }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmitComment(proof.id);
                            }
                          }}
                          className="flex-1 bg-white/[0.05] border-white/10 text-white placeholder:text-white/30"
                        />
                        <Button
                          size="icon"
                          onClick={() => handleSubmitComment(proof.id)}
                          disabled={!commentInputs[proof.id]?.trim() || addCommentMutation.isPending}
                          className="bg-[var(--accent-violet)] hover:bg-[var(--accent-violet)]/80"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Media Viewer */}
      <ProofMediaViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        mediaUrl={viewerMedia?.url || ""}
        mediaType={viewerMedia?.type || "IMAGE"}
        caption={viewerMedia?.caption}
        uploaderName={viewerMedia?.uploaderName}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProofId} onOpenChange={() => setDeleteProofId(null)}>
        <AlertDialogContent className="bg-[var(--dusk-2)] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Proof?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/10 hover:bg-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProofId && deleteProofMutation.mutate(deleteProofId)}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteProofMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
