"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  UserPlus,
  UserCheck,
  MessageCircle,
  Users,
  Target,
  Trophy,
  Loader2,
  Clock,
  Image as ImageIcon,
  MoreVertical,
  UserMinus,
  Ban,
  Flag,
} from "lucide-react";
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
import { ProofMediaViewer } from "@/components/groups/proof-media-viewer";
import { ReportDialog } from "@/components/reports/report-dialog";

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

interface Proof {
  id: string;
  caption: string | null;
  mediaType: string;
  mediaUrl: string | null;
  textContent: string | null;
  createdAt: string;
  group: { id: string; name: string };
  ruleLinks: { rule: { description: string } }[];
}

interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  status: string;
  durationDays: number;
  memberCount: number;
}

interface UserProfile {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  profileStats: {
    totalGroups: number;
    totalRules: number;
    totalProofs: number;
    successRate: number;
  } | null;
  proofs: Proof[];
  groups: UserGroup[];
  friendshipStatus: "none" | "pending-sent" | "pending-received" | "friends";
  friendshipId?: string;
  mutualFriends: number;
}

// Canonical profile route: /profile/[username]
// API: /api/users/[username]
export default function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedProof, setSelectedProof] = useState<Proof | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Validate username - must be defined and not the string "null" or "undefined"
  const isValidUsername = Boolean(username && username !== "null" && username !== "undefined" && username.trim() !== "");

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["user-profile", username],
    queryFn: async () => {
      const res = await fetch(`/api/users/${username}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    // Only run query if username is valid
    enabled: isValidUsername,
  });

  const sendRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: profile?.id }),
      });
      if (!res.ok) throw new Error("Failed to send request");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", username] });
      toast.success("Friend request sent!");
    },
    onError: () => {
      toast.error("Failed to send friend request");
    },
  });

  const respondMutation = useMutation({
    mutationFn: async (accept: boolean) => {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendshipId: profile?.friendshipId,
          accept,
        }),
      });
      if (!res.ok) throw new Error("Failed to respond");
      return res.json();
    },
    onSuccess: (_, accept) => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", username] });
      toast.success(accept ? "Friend request accepted!" : "Request declined");
    },
    onError: () => {
      toast.error("Failed to respond to request");
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.friendshipId) throw new Error("No friendship found");
      const res = await fetch(`/api/friends/${profile.friendshipId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove friend");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", username] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      toast.success("Friend removed");
      setShowRemoveDialog(false);
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
        body: JSON.stringify({ userId: profile?.id }),
      });
      if (!res.ok) throw new Error("Failed to block user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", username] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      toast.success("User blocked");
      setShowBlockDialog(false);
      router.back();
    },
    onError: () => {
      toast.error("Failed to block user");
    },
  });

  // Handle invalid username early
  if (!isValidUsername) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg font-medium">Invalid profile link</p>
        <p className="text-sm text-muted-foreground mt-1">The profile URL is malformed</p>
        <Button variant="link" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg font-medium">User not found</p>
        <Button variant="link" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const isOwnProfile = profile.id === session?.user?.id;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">{profile.name || profile.username}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <div className="p-6 text-center">
        <Avatar className="h-24 w-24 mx-auto mb-4">
          <AvatarImage src={profile.avatarUrl || undefined} />
          <AvatarFallback className="text-2xl">
            {profile.name?.[0] || profile.username?.[0] || "?"}
          </AvatarFallback>
        </Avatar>

        <h2 className="text-xl font-bold">{profile.name || profile.username}</h2>
        <p className="text-muted-foreground">@{profile.username}</p>

        {profile.bio && (
          <p className="mt-3 text-sm max-w-xs mx-auto">{profile.bio}</p>
        )}

        {profile.mutualFriends > 0 && !isOwnProfile && (
          <p className="mt-2 text-sm text-muted-foreground">
            {profile.mutualFriends} mutual friends
          </p>
        )}

        {/* Action Buttons */}
        {!isOwnProfile && (
          <div className="mt-4 flex justify-center gap-3">
            {profile.friendshipStatus === "none" && (
              <Button
                onClick={() => sendRequestMutation.mutate()}
                disabled={sendRequestMutation.isPending}
              >
                {sendRequestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Add Friend
              </Button>
            )}

            {profile.friendshipStatus === "pending-sent" && (
              <Button variant="secondary" disabled>
                <Clock className="h-4 w-4 mr-2" />
                Request Sent
              </Button>
            )}

            {profile.friendshipStatus === "pending-received" && (
              <>
                <Button
                  onClick={() => respondMutation.mutate(true)}
                  disabled={respondMutation.isPending}
                >
                  Accept Request
                </Button>
                <Button
                  variant="outline"
                  onClick={() => respondMutation.mutate(false)}
                  disabled={respondMutation.isPending}
                >
                  Decline
                </Button>
              </>
            )}

            {profile.friendshipStatus === "friends" && (
              <>
                <Button variant="secondary" disabled>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Friends
                </Button>
                <Button variant="outline">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => setShowReportDialog(true)}
                      className="text-orange-600"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Report User
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowRemoveDialog(true)}
                      className="text-orange-600"
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove Friend
                    </DropdownMenuItem>
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

            {/* Non-friends can still block */}
            {profile.friendshipStatus !== "friends" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setShowReportDialog(true)}
                    className="text-orange-600"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Report User
                  </DropdownMenuItem>
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
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 px-4">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">
              {profile.profileStats?.totalGroups || 0}
            </p>
            <p className="text-xs text-muted-foreground">Groups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">
              {profile.profileStats?.totalRules || 0}
            </p>
            <p className="text-xs text-muted-foreground">Rules</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">
              {profile.profileStats?.totalProofs || 0}
            </p>
            <p className="text-xs text-muted-foreground">Proofs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">
              {profile.profileStats?.successRate || 0}%
            </p>
            <p className="text-xs text-muted-foreground">Success</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <div className="px-4 mt-6">
        <Tabs defaultValue="proofs">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="proofs" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Proofs
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <Users className="h-4 w-4" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Trophy className="h-4 w-4" />
              Achievements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proofs" className="mt-4">
            {profile.proofs && profile.proofs.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {profile.proofs.map((proof) => (
                  <Card 
                    key={proof.id} 
                    className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                    onClick={() => {
                      setSelectedProof(proof);
                      setViewerOpen(true);
                    }}
                  >
                    <div className="aspect-square relative">
                      {proof.mediaUrl ? (
                        (proof.mediaType === "VIDEO" || proof.mediaType === "video") ? (
                          <video
                            src={proof.mediaUrl}
                            className="w-full h-full object-cover"
                            controls={false}
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={proof.mediaUrl}
                            alt={proof.caption || "Proof"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )
                      ) : (proof.mediaType === "TEXT" || proof.mediaType === "text") && proof.textContent ? (
                        // Text proof display
                        <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center p-3">
                          <p className="text-sm text-center line-clamp-5 leading-relaxed">
                            {proof.textContent}
                          </p>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs text-white font-medium truncate">
                          {proof.group.name}
                        </p>
                      </div>
                    </div>
                    {(proof.caption || proof.textContent) && (
                      <CardContent className="p-2">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {proof.caption || proof.textContent}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No proofs yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="groups" className="mt-4">
            {(isOwnProfile || profile.friendshipStatus === "friends") && profile.groups && profile.groups.length > 0 ? (
              <div className="space-y-3">
                {profile.groups.map((group) => (
                  <Link key={group.id} href={`/groups/${group.id}`}>
                    <Card className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{group.name}</h3>
                            {group.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                {group.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {group.memberCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {group.durationDays} days
                              </span>
                              <Badge variant={
                                group.status === "ACTIVE" ? "default" :
                                group.status === "COMPLETED" ? "secondary" :
                                "outline"
                              } className="text-xs">
                                {group.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {!isOwnProfile && profile.friendshipStatus !== "friends"
                      ? "Become friends to see groups"
                      : "No groups to show"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="mt-4">
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No achievements yet</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Proof Media Viewer */}
      {selectedProof && selectedProof.mediaUrl && (
        <ProofMediaViewer
          open={viewerOpen}
          onOpenChange={(open) => {
            setViewerOpen(open);
            if (!open) setSelectedProof(null);
          }}
          mediaUrl={selectedProof.mediaUrl}
          mediaType={selectedProof.mediaType as "IMAGE" | "VIDEO" | "AUDIO"}
          caption={selectedProof.caption}
          uploaderName={profile.name || undefined}
        />
      )}

      {/* Remove Friend Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {profile.name || profile.username} from your friends? 
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
              Are you sure you want to block {profile.name || profile.username}? 
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
      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        type="USER"
        targetId={profile.id}
        targetName={profile.name || profile.username || undefined}
      />
    </div>
  );
}
