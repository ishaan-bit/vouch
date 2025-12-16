"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { Search, Users, Sparkles, Trophy, Plus, LayoutGrid, Layers, Clock, Coins, Ticket, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SwipeDeck, DiscoverPact } from "./swipe-deck";

// Types
interface DiscoverUser {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
  createdAt: string;
  _count?: {
    memberships?: number;
  };
}

// User Card Component
function UserCard({ user }: { user: DiscoverUser }) {
  const [isHovered, setIsHovered] = useState(false);
  // Defensive: ensure memberships count is a number
  const membershipsCount = user._count?.memberships ?? 0;
  
  return (
    <Link href={`/profile/${user.username || user.id}`}>
      <div
        className={cn(
          "relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-300",
          "bg-[var(--dusk-2)]/60 backdrop-blur-xl",
          "border border-white/[0.06]",
          isHovered && "bg-[var(--dusk-2)]/80 border-white/[0.1]"
        )}
        style={{
          boxShadow: isHovered 
            ? "0 8px 32px rgba(0,0,0,0.3), 0 0 40px rgba(139, 92, 246, 0.08)"
            : "0 2px 12px rgba(0,0,0,0.2)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative">
          <Avatar className="w-14 h-14 border-2 border-white/10">
            <AvatarImage src={user.avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white font-medium">
              {user.name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--accent-teal)] border-2 border-[var(--dusk-2)]" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{user.name || "Anonymous"}</h3>
          <p className="text-sm text-white/40 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            {membershipsCount} pact{membershipsCount !== 1 ? "s" : ""}
          </p>
        </div>
        
        <div className={cn(
          "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
          "bg-white/[0.06] text-white/70 border border-white/[0.08]",
          "group-hover:bg-[var(--accent-violet)]/20 group-hover:text-[var(--accent-lilac)]"
        )}>
          View
        </div>
      </div>
    </Link>
  );
}

// Empty State Component
function EmptyState({ type }: { type: "pacts" | "people" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-[var(--dusk-2)] flex items-center justify-center mb-4">
        {type === "pacts" ? (
          <Sparkles className="w-8 h-8 text-[var(--accent-lilac)]/50" />
        ) : (
          <Users className="w-8 h-8 text-[var(--accent-lilac)]/50" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-white/70 mb-2">
        {type === "pacts" ? "No Pacts Recruiting" : "No People Found"}
      </h3>
      <p className="text-sm text-white/40 text-center max-w-xs mb-6">
        {type === "pacts" 
          ? "Be the first to create a pact and start a ritual with friends."
          : "Invite your friends to join Vouch and build accountability together."
        }
      </p>
      {type === "pacts" && (
        <Link href="/groups/create">
          <Button className="bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white px-6 py-3 rounded-xl font-semibold">
            <Plus className="w-5 h-5 mr-2" />
            Create a Pact
          </Button>
        </Link>
      )}
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-[520px] rounded-3xl bg-[var(--dusk-2)]/60 animate-pulse" />
      <div className="flex items-center justify-center gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-12 h-12 rounded-full bg-[var(--dusk-3)] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// Grid Card for alternative view
function PactGridCard({ pact }: { pact: DiscoverPact }) {
  const formatStake = (amountPaise: number | null | undefined) => {
    if (!amountPaise) return "Free";
    return `₹${(amountPaise / 100).toFixed(0)}`;
  };

  return (
    <Link href={`/groups/${pact.id}`}>
      <div className={cn(
        "relative overflow-hidden rounded-2xl transition-all duration-300",
        "bg-[var(--dusk-2)]/80 backdrop-blur-xl",
        "border border-white/[0.08] hover:border-white/[0.15]",
        "hover:scale-[1.02] hover:-translate-y-1"
      )}
      style={{
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
      >
        <div className="h-20 bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] relative">
          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/30 backdrop-blur-md rounded-full text-xs text-white flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {pact.durationDays}d
          </div>
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/30 backdrop-blur-md rounded-full text-xs text-[var(--accent-gold)] flex items-center gap-1">
            <Coins className="w-3 h-3" />
            {formatStake(pact.stakes?.minStakeAmount)}
          </div>
        </div>

        <div className="p-3">
          <h3 className="text-sm font-semibold text-white truncate mb-1">{pact.name}</h3>
          <div className="flex items-center gap-1 text-xs text-white/40">
            <Users className="w-3 h-3" />
            <span>{pact.memberCount}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

interface DiscoverContentProps {
  userId?: string;
}

// Main Discover Content Component
export function DiscoverContent({ userId }: DiscoverContentProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pacts");
  const [viewMode, setViewMode] = useState<"swipe" | "grid">("swipe");
  const [joinCodeOpen, setJoinCodeOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  // Handle joining with invite code
  const handleJoinWithCode = async () => {
    const code = inviteCode.trim();
    if (!code) {
      toast.error("Please enter an invite code");
      return;
    }
    
    setIsJoining(true);
    try {
      // Navigate to the invite page which handles the join flow
      router.push(`/i/${code}`);
    } catch {
      toast.error("Invalid invite code");
      setIsJoining(false);
    }
  };

  // Fetch discoverable pacts
  const { data: pacts = [], isLoading: pactsLoading } = useQuery<DiscoverPact[]>({
    queryKey: ["discover-pacts"],
    queryFn: async () => {
      const res = await fetch("/api/groups/discover");
      if (!res.ok) throw new Error("Failed to fetch pacts");
      return res.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  // Fetch users for people tab
  const { data: users = [], isLoading: usersLoading } = useQuery<DiscoverUser[]>({
    queryKey: ["discover-users"],
    queryFn: async () => {
      const res = await fetch("/api/users/suggested");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  // Filter pacts that are joinable and not already member
  const joinablePacts = pacts.filter(
    (pact) => !pact.isMember && pact.status === "PLANNING"
  );

  // Filter based on search
  const filteredPacts = joinablePacts.filter((pact) =>
    pact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pact.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Header */}
      <div className="relative px-4 pt-12 pb-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[var(--accent-violet)]/20 blur-[60px] rounded-full" />
        
        <div className="relative">
          <h1 className="text-3xl font-bold text-center mb-2">
            <span className="bg-gradient-to-r from-white via-[var(--accent-lilac)] to-white bg-clip-text text-transparent">
              Discover
            </span>
          </h1>
          <p className="text-center text-white/40 text-sm mb-4">
            Find your next accountability ritual
          </p>
          
          {/* Join with Code Button */}
          <div className="flex justify-center mb-4">
            <button
              onClick={() => setJoinCodeOpen(true)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm",
                "bg-[var(--dusk-3)] border border-white/10",
                "text-white/70 hover:text-white hover:border-white/20",
                "active:scale-[0.97] transition-all duration-200"
              )}
            >
              <Ticket className="h-4 w-4" />
              Join with Invite Code
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <Input
              placeholder="Search pacts or people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-12 pr-4 py-3 h-12 rounded-2xl",
                "bg-[var(--dusk-2)]/80 backdrop-blur-xl",
                "border border-white/[0.08] focus:border-[var(--accent-violet)]/50",
                "text-white placeholder:text-white/30",
                "focus:ring-2 focus:ring-[var(--accent-violet)]/20",
                "transition-all duration-300"
              )}
            />
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
        <div className="flex items-center justify-between mb-4">
          <TabsList className={cn(
            "h-11 p-1 rounded-xl",
            "bg-[var(--dusk-2)]/60 backdrop-blur-xl",
            "border border-white/[0.06]"
          )}>
            <TabsTrigger 
              value="pacts"
              className={cn(
                "h-full px-4 rounded-lg text-sm font-medium transition-all duration-300",
                "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--accent-violet)] data-[state=active]:to-[var(--accent-magenta)]",
                "data-[state=active]:text-white data-[state=active]:shadow-lg"
              )}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Pacts
            </TabsTrigger>
            <TabsTrigger 
              value="people"
              className={cn(
                "h-full px-4 rounded-lg text-sm font-medium transition-all duration-300",
                "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60",
                "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--accent-violet)] data-[state=active]:to-[var(--accent-magenta)]",
                "data-[state=active]:text-white data-[state=active]:shadow-lg"
              )}
            >
              <Users className="w-4 h-4 mr-2" />
              People
            </TabsTrigger>
          </TabsList>

          {activeTab === "pacts" && (
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--dusk-2)]/60 border border-white/[0.06]">
              <button
                onClick={() => setViewMode("swipe")}
                className={cn(
                  "p-2 rounded-md transition-all",
                  viewMode === "swipe"
                    ? "bg-[var(--accent-violet)]/20 text-[var(--accent-lilac)]"
                    : "text-white/40 hover:text-white/60"
                )}
                title="Swipe view"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 rounded-md transition-all",
                  viewMode === "grid"
                    ? "bg-[var(--accent-violet)]/20 text-[var(--accent-lilac)]"
                    : "text-white/40 hover:text-white/60"
                )}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        {/* Pacts Tab */}
        <TabsContent value="pacts" className="mt-0 pb-8">
          {pactsLoading ? (
            <LoadingSkeleton />
          ) : filteredPacts.length > 0 ? (
            viewMode === "swipe" ? (
              <SwipeDeck pacts={filteredPacts} />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredPacts.map((pact) => (
                  <PactGridCard key={pact.id} pact={pact} />
                ))}
              </div>
            )
          ) : (
            <EmptyState type="pacts" />
          )}
        </TabsContent>
        
        {/* People Tab */}
        <TabsContent value="people" className="mt-0 pb-8">
          {usersLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-[var(--dusk-2)]/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          ) : (
            <EmptyState type="people" />
          )}
        </TabsContent>
      </Tabs>

      {/* Join with Code Dialog */}
      <BottomSheet open={joinCodeOpen} onOpenChange={setJoinCodeOpen}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>Join a Pact</BottomSheetTitle>
            <BottomSheetDescription>
              Enter the invite code shared with you
            </BottomSheetDescription>
          </BottomSheetHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABCD1234"
                className="text-center text-lg font-mono tracking-widest uppercase"
                maxLength={20}
              />
            </div>
            <Button
              onClick={handleJoinWithCode}
              disabled={isJoining || !inviteCode.trim()}
              className="w-full bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white"
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Join Pact
                </>
              )}
            </Button>
          </div>
        </BottomSheetContent>
      </BottomSheet>
    </div>
  );
}
