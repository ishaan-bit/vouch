"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, FileText, Link as LinkIcon, Mic, Video, Flame, ThumbsUp, Skull } from "lucide-react";

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
  const { data: proofs, isLoading } = useQuery<Proof[]>({
    queryKey: ["proofs", groupId, dayIndex],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/proofs?day=${dayIndex}`);
      if (!res.ok) throw new Error("Failed to fetch proofs");
      return res.json();
    },
  });

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
                        <div className="mb-3 overflow-hidden rounded-lg">
                          <img
                            src={proof.mediaUrl}
                            alt="Proof"
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}
                      {proof.mediaUrl && proof.mediaType === "VIDEO" && (
                        <div className="mb-3 overflow-hidden rounded-lg">
                          <video
                            src={proof.mediaUrl}
                            controls
                            className="w-full h-48 object-cover"
                          />
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
                              className="h-8 gap-1"
                            >
                              <span>{emoji}</span>
                              {count > 0 && (
                                <span className="text-xs">{count}</span>
                              )}
                            </Button>
                          );
                        })}
                      </div>
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
    </div>
  );
}
