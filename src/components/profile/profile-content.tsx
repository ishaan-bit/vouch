"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { toast } from "sonner";
import {
  Settings,
  Edit,
  Camera,
  Target,
  Users,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Star,
  LogOut,
  Trophy,
  Flame,
  Loader2,
  Upload,
  CheckCircle2,
  Clock,
  Coins,
  ArrowUpRight,
  Plus,
  ChevronRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/upi";
import { AddProofDialog } from "@/components/groups/add-proof-dialog";
import { ProofMediaViewer } from "@/components/groups/proof-media-viewer";

interface ProfileStats {
  totalEarned: number;
  totalPaid: number;
  groupsCompleted: number;
  groupsStarted: number;
  trustScore: number;
  rulesCreatedCount: number;
  rulesCompletedCount: number;
  longestStreak: number;
}

interface Proof {
  id: string;
  caption: string | null;
  mediaType: string;
  mediaUrl: string | null;
  textContent: string | null;
  createdAt: string | Date;
  group: { id: string; name: string };
  ruleLinks: { rule: { description: string } }[];
}

interface Rule {
  id: string;
  title?: string;
  description: string;
  stakeAmount: number;
  group: { id: string; name: string };
}

interface Group {
  id: string;
  name: string;
  status: string;
  durationDays: number;
  _count: { memberships: number; rules: number };
  rules?: { id: string; description: string }[];
}

interface GroupMembership {
  group: Group;
}

interface Friend {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

interface User {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  upiId: string | null;
  profileStats: ProfileStats | null;
  proofs: Proof[];
  createdRules: Rule[];
  groupMemberships: GroupMembership[];
}

interface ProfileContentProps {
  user: User;
  friends: Friend[];
  isOwnProfile: boolean;
}

export function ProfileContent({ user, friends, isOwnProfile }: ProfileContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectPactOpen, setSelectPactOpen] = useState(false);
  const [selectedPactForProof, setSelectedPactForProof] = useState<Group | null>(null);
  const [addProofOpen, setAddProofOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState<Proof | null>(null);
  const stats = user.profileStats;

  // Get active groups for proof upload
  const activeGroups = user.groupMemberships
    .filter((m) => m.group.status === "ACTIVE")
    .map((m) => m.group);

  // Avatar upload mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "avatar");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      // Get response text first, then try to parse as JSON
      const uploadText = await uploadRes.text();
      let uploadData;
      try {
        uploadData = JSON.parse(uploadText);
      } catch {
        throw new Error(`Upload failed: ${uploadText || "Unknown error"}`);
      }
      
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || "Failed to upload image");
      }

      const url = uploadData.url;

      // Update user profile with new avatar
      const updateRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: url }),
      });

      if (!updateRes.ok) {
        throw new Error("Failed to update profile");
      }

      return updateRes.json();
    },
    onSuccess: () => {
      setIsUploading(false);
      toast.success("Avatar updated!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      router.refresh();
    },
    onError: (error: Error) => {
      setIsUploading(false);
      toast.error(error.message);
    },
  });

  const handleAvatarClick = () => {
    if (isOwnProfile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      uploadAvatarMutation.mutate(file);
    }
  };

  const getTrustBadge = (score: number) => {
    if (score >= 90) return { label: "Elite", icon: "🏆", color: "from-amber-400 to-orange-500" };
    if (score >= 80) return { label: "Trusted", icon: "⭐", color: "from-emerald-400 to-cyan-500" };
    if (score >= 60) return { label: "Reliable", icon: "✓", color: "from-blue-400 to-violet-500" };
    if (score >= 40) return { label: "Rising", icon: "↗", color: "from-violet-400 to-fuchsia-500" };
    return { label: "New", icon: "•", color: "from-slate-400 to-slate-500" };
  };

  const trustBadge = getTrustBadge(stats?.trustScore || 50);
  const trustScore = stats?.trustScore || 50;

  const formatAmount = (paise: number) => {
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate net earnings
  const netEarnings = (stats?.totalEarned || 0) - (stats?.totalPaid || 0);
  const isPositive = netEarnings >= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950">
      {/* Gradient Background Header */}
      <div className="relative h-48 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500">
        {/* Mesh pattern overlay using CSS */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        
        {/* Settings button */}
        {isOwnProfile && (
          <div className="absolute top-4 right-4 flex gap-2">
            <Link href="/profile/edit">
              <Button size="icon" variant="ghost" className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 rounded-full">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Profile Content */}
      <div className="relative px-4 -mt-24">
        <div className="max-w-2xl mx-auto">
          {/* Avatar + Main Info */}
          <div className="flex flex-col items-center text-center">
            {/* Avatar with upload */}
            <div className="relative group">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-slate-950 shadow-2xl">
                  <AvatarImage src={user.avatarUrl || undefined} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                {/* Trust ring */}
                <svg className="absolute -inset-1 h-[136px] w-[136px]" viewBox="0 0 136 136">
                  <circle
                    cx="68"
                    cy="68"
                    r="66"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-slate-800"
                  />
                  <circle
                    cx="68"
                    cy="68"
                    r="66"
                    fill="none"
                    stroke="url(#trustGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${(trustScore / 100) * 415} 415`}
                    transform="rotate(-90 68 68)"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="trustGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#D946EF" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              
              {/* Upload overlay */}
              {isOwnProfile && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={handleAvatarClick}
                    disabled={isUploading}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {isUploading ? (
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    ) : (
                      <Camera className="h-8 w-8 text-white" />
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Name & Username */}
            <h1 className="mt-4 text-2xl font-bold text-white">{user.name}</h1>
            <p className="text-slate-400">@{user.username}</p>
            
            {/* Bio */}
            {user.bio && (
              <p className="mt-3 text-slate-300 max-w-sm">{user.bio}</p>
            )}

            {/* Trust Badge */}
            <div className="mt-4 flex items-center gap-3">
              <span className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${trustBadge.color} text-white text-sm font-medium shadow-lg`}>
                {trustBadge.icon} {trustBadge.label}
              </span>
              <span className="text-sm text-slate-400">
                {trustScore.toFixed(0)}/100 Trust
              </span>
            </div>

            {/* Quick Stats Row */}
            <div className="flex items-center gap-6 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats?.groupsCompleted || 0}</div>
                <div className="text-xs text-slate-400">Completed</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats?.longestStreak || 0}</div>
                <div className="text-xs text-slate-400">Day Streak</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{friends.length}</div>
                <div className="text-xs text-slate-400">Friends</div>
              </div>
            </div>

            {/* Action Buttons */}
            {isOwnProfile && (
              <div className="flex gap-3 mt-6">
                <Link href="/profile/edit">
                  <Button className="bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border-0 rounded-xl">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Earnings Cards */}
          <div className="grid grid-cols-2 gap-3 mt-8">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Earned</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {formatAmount(stats?.totalEarned || 0)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 text-orange-400 mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="text-sm">Paid</span>
              </div>
              <div className="text-2xl font-bold text-orange-400">
                {formatAmount(stats?.totalPaid || 0)}
              </div>
            </div>
          </div>

          {/* Net Balance */}
          <div className={`mt-3 p-4 rounded-2xl border ${isPositive ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Net Balance</span>
              <span className={`text-xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{formatAmount(netEarnings)}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-2 mt-6">
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 text-center">
              <Trophy className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{stats?.groupsCompleted || 0}</div>
              <div className="text-[10px] text-slate-500 uppercase">Won</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 text-center">
              <Clock className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{stats?.groupsStarted || 0}</div>
              <div className="text-[10px] text-slate-500 uppercase">Started</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 text-center">
              <Target className="h-5 w-5 text-violet-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{stats?.rulesCreatedCount || 0}</div>
              <div className="text-[10px] text-slate-500 uppercase">Rules</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 text-center">
              <Flame className="h-5 w-5 text-orange-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-white">{stats?.longestStreak || 0}</div>
              <div className="text-[10px] text-slate-500 uppercase">Streak</div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="proofs" className="mt-8">
            <TabsList className="w-full bg-slate-900/50 border border-slate-800/50 rounded-2xl p-1 h-auto">
              <TabsTrigger 
                value="proofs" 
                className="flex-1 rounded-xl py-2.5 text-sm data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300"
              >
                <Camera className="h-4 w-4 mr-1.5" />
                Proofs
              </TabsTrigger>
              <TabsTrigger 
                value="groups" 
                className="flex-1 rounded-xl py-2.5 text-sm data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300"
              >
                <Users className="h-4 w-4 mr-1.5" />
                Groups
              </TabsTrigger>
              <TabsTrigger 
                value="friends" 
                className="flex-1 rounded-xl py-2.5 text-sm data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300"
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                Friends
              </TabsTrigger>
            </TabsList>

            {/* Proofs Tab */}
            <TabsContent value="proofs" className="mt-4">
              {/* Add Proof Button - Only for own profile with active pacts */}
              {isOwnProfile && activeGroups.length > 0 && (
                <Button
                  onClick={() => setSelectPactOpen(true)}
                  className="w-full mb-4 bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)] hover:opacity-90 text-white rounded-xl h-12"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Post New Proof
                </Button>
              )}

              {user.proofs.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
                  {user.proofs.map((proof) => (
                    <div
                      key={proof.id}
                      className="aspect-square relative overflow-hidden bg-slate-800 group cursor-pointer"
                      onClick={() => {
                        // Open proof in lightbox viewer
                        if (proof.mediaUrl || proof.textContent) {
                          setSelectedProof(proof);
                          setViewerOpen(true);
                        }
                      }}
                    >
                      {proof.mediaUrl && (proof.mediaType === "IMAGE" || proof.mediaType === "image") ? (
                        <img
                          src={proof.mediaUrl}
                          alt={proof.caption || "Proof"}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            // Hide broken image and show fallback
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : proof.mediaUrl && (proof.mediaType === "VIDEO" || proof.mediaType === "video") ? (
                        <video
                          src={proof.mediaUrl}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                        />
                      ) : proof.mediaUrl ? (
                        // Fallback for any media URL - try to display as image
                        <img
                          src={proof.mediaUrl}
                          alt={proof.caption || "Proof"}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (proof.mediaType === "TEXT" || proof.mediaType === "text") && proof.textContent ? (
                        // Text proof display
                        <div className="flex h-full items-center justify-center p-3 bg-gradient-to-br from-[var(--accent-violet)]/20 to-[var(--accent-magenta)]/20">
                          <p className="text-white text-xs text-center line-clamp-5 leading-relaxed">
                            {proof.textContent}
                          </p>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-600">
                          <Camera className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <p className="text-white text-xs line-clamp-2">{proof.caption || proof.textContent || proof.group.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4">
                    <Camera className="h-8 w-8 text-slate-500" />
                  </div>
                  <p className="text-slate-400">No public proofs yet</p>
                  <p className="text-sm text-slate-500 mt-1">Proofs show others you&apos;re keeping your word</p>
                  {isOwnProfile && activeGroups.length > 0 && (
                    <Button
                      onClick={() => setSelectPactOpen(true)}
                      variant="ghost"
                      className="mt-4 text-[var(--accent-lilac)] hover:text-[var(--accent-lilac)] hover:bg-[var(--accent-lilac)]/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Post Your First Proof
                    </Button>
                  )}
                  {isOwnProfile && activeGroups.length === 0 && (
                    <p className="text-xs text-slate-600 mt-4">Join an active pact to start posting proofs</p>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Groups Tab */}
            <TabsContent value="groups" className="mt-4 space-y-3">
              {user.groupMemberships.length > 0 ? (
                user.groupMemberships.map((membership) => (
                  <Link key={membership.group.id} href={`/groups/${membership.group.id}`}>
                    <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:border-violet-500/30 transition-all group">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-white group-hover:text-violet-300 transition-colors">
                            {membership.group.name}
                          </h3>
                          <p className="text-sm text-slate-400 mt-0.5">
                            {membership.group._count.memberships} members · {membership.group._count.rules} rules · {membership.group.durationDays} days
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            membership.group.status === "ACTIVE"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : membership.group.status === "COMPLETED"
                              ? "bg-slate-500/20 text-slate-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}>
                            {membership.group.status}
                          </span>
                          <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-16 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4">
                    <Users className="h-8 w-8 text-slate-500" />
                  </div>
                  <p className="text-slate-400">No groups joined yet</p>
                  <p className="text-sm text-slate-500 mt-1">Join or create a group to get started</p>
                </div>
              )}
            </TabsContent>

            {/* Friends Tab */}
            <TabsContent value="friends" className="mt-4 space-y-3">
              {friends.length > 0 ? (
                friends.map((friend) => (
                  <Link key={friend.id} href={`/profile/${friend.username || friend.id}`}>
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 hover:border-violet-500/30 transition-all group">
                      <Avatar className="h-12 w-12 border border-slate-700">
                        <AvatarImage src={friend.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                          {getInitials(friend.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-white group-hover:text-violet-300 transition-colors">
                          {friend.name}
                        </p>
                        <p className="text-sm text-slate-400">@{friend.username}</p>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-16 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4">
                    <Users className="h-8 w-8 text-slate-500" />
                  </div>
                  <p className="text-slate-400">No friends yet</p>
                  <p className="text-sm text-slate-500 mt-1">Complete challenges together to make friends</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Sign Out */}
          {isOwnProfile && (
            <Button
              variant="ghost"
              className="w-full mt-8 mb-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          )}
        </div>
      </div>

      {/* Select Pact Dialog */}
      <BottomSheet open={selectPactOpen} onOpenChange={setSelectPactOpen}>
        <BottomSheetContent className="bg-[var(--dusk-1)] border-white/[0.06]">
          <BottomSheetHeader>
            <BottomSheetTitle className="text-white flex items-center gap-2">
              <Camera className="h-5 w-5 text-[var(--accent-lilac)]" />
              Select a Pact
            </BottomSheetTitle>
          </BottomSheetHeader>
          
          <div className="space-y-2 mt-4">
            <p className="text-sm text-white/40 px-1">
              Choose which active pact to post your proof to:
            </p>
            {activeGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  setSelectedPactForProof(group);
                  setSelectPactOpen(false);
                  // Navigate to group page to use AddProofDialog with proper rules
                  router.push(`/groups/${group.id}?openProof=true`);
                }}
                className="w-full flex items-center justify-between p-4 rounded-xl transition-all bg-[var(--dusk-2)]/60 hover:bg-[var(--dusk-2)] border border-white/[0.06] hover:border-white/[0.1] min-h-[56px] touch-action-manipulation"
              >
                <div className="text-left">
                  <p className="font-medium text-white">{group.name}</p>
                  <p className="text-sm text-white/40">
                    {group._count.rules} rule{group._count.rules !== 1 ? "s" : ""} • {group.durationDays} days
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-white/30" />
              </button>
            ))}
          </div>
        </BottomSheetContent>
      </BottomSheet>

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
          uploaderName={user.name || undefined}
        />
      )}
    </div>
  );
}
