"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Search, X, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CreateGroupFormProps {
  userId: string;
}

interface Friend {
  id: string;
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
}

const DURATION_PRESETS = [
  { value: 3, label: "3 days" },
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

const MIN_DURATION = 1;
const MAX_DURATION = 90;

export function CreateGroupForm({ userId }: CreateGroupFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [customDuration, setCustomDuration] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [durationError, setDurationError] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch friends
  const { data: friends } = useQuery<Friend[]>({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await fetch("/api/friends");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, durationDays }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create group");
      }
      return res.json();
    },
    onSuccess: async (group) => {
      // Invite selected members
      if (selectedMembers.length > 0) {
        await fetch(`/api/groups/${group.id}/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: selectedMembers.map((m) => m.id) }),
        });
      }
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Pact created!");
      router.push(`/groups/${group.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handlePresetClick = (value: number) => {
    setDurationDays(value);
    setCustomDuration("");
    setIsCustom(false);
    setDurationError("");
  };

  const handleCustomDurationChange = (value: string) => {
    setCustomDuration(value);
    setIsCustom(true);
    
    const num = parseInt(value, 10);
    if (value === "") {
      setDurationError("");
      return;
    }
    
    if (isNaN(num)) {
      setDurationError("Please enter a valid number");
      return;
    }
    
    if (num < MIN_DURATION) {
      setDurationError(`Minimum duration is ${MIN_DURATION} day`);
      return;
    }
    
    if (num > MAX_DURATION) {
      setDurationError(`Maximum duration is ${MAX_DURATION} days`);
      return;
    }
    
    setDurationError("");
    setDurationDays(num);
  };

  const filteredFriends = friends?.filter(
    (f) =>
      !selectedMembers.some((m) => m.id === f.id) &&
      (f.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addMember = (friend: Friend) => {
    setSelectedMembers([...selectedMembers, friend]);
  };

  const removeMember = (friendId: string) => {
    setSelectedMembers(selectedMembers.filter((m) => m.id !== friendId));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (durationError) {
      toast.error("Please fix the duration error");
      return;
    }
    createGroupMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-white">Create Pact</h1>
            <p className="text-sm text-slate-400">Step {step} of 2</p>
          </div>
        </div>
        
        {/* Progress */}
        <div className="flex gap-1 px-4 pb-3 max-w-lg mx-auto">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-gradient-to-r from-violet-500 to-indigo-500" : "bg-slate-800"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative px-4 py-6 space-y-6 max-w-lg mx-auto">
        {step === 1 && (
          <>
            {/* Step 1: Basic Info */}
            <div className="rounded-3xl bg-slate-800/30 border border-slate-700/50 p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white mb-1">Pact Details</h2>
              <p className="text-sm text-slate-400 mb-6">Set up your accountability challenge</p>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">Pact Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Morning Routine Challenge"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-300">Description (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="What's this challenge about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px] bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Duration
                  </Label>
                  
                  {/* Preset pills */}
                  <div className="flex flex-wrap gap-2">
                    {DURATION_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handlePresetClick(preset.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          durationDays === preset.value && !isCustom
                            ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/20"
                            : "bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:border-violet-500/50"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Custom input */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-400">Or enter custom:</span>
                      <div className="relative flex-1 max-w-32">
                        <Input
                          type="number"
                          min={MIN_DURATION}
                          max={MAX_DURATION}
                          placeholder="e.g., 21"
                          value={customDuration}
                          onChange={(e) => handleCustomDurationChange(e.target.value)}
                          className={`bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl pr-12 ${
                            isCustom && customDuration ? "ring-2 ring-violet-500 border-violet-500" : ""
                          } ${durationError ? "border-red-500 ring-red-500" : ""}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                          days
                        </span>
                      </div>
                    </div>
                    
                    {durationError && (
                      <div className="flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {durationError}
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-500">
                      Choose {MIN_DURATION}–{MAX_DURATION} days
                    </p>
                  </div>
                  
                  {/* Current selection display */}
                  <div className="flex items-center justify-center p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-white">{durationDays}</p>
                      <p className="text-sm text-violet-300">day{durationDays !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button
              className="w-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 py-6"
              onClick={() => setStep(2)}
              disabled={!name.trim() || !!durationError}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            {/* Step 2: Invite Members */}
            <div className="rounded-3xl bg-slate-800/30 border border-slate-700/50 p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white mb-1">Invite Members</h2>
              <p className="text-sm text-slate-400 mb-6">Add friends to join your {durationDays}-day pact</p>
              
              <div className="space-y-4">
                {/* Selected members */}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <Badge
                        key={member.id}
                        variant="secondary"
                        className="flex items-center gap-2 py-1.5 pl-1.5 pr-2 bg-violet-500/20 text-violet-200 border-violet-500/30"
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback className="text-[10px] bg-violet-600">
                            {member.name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        {member.name}
                        <button
                          onClick={() => removeMember(member.id)}
                          className="ml-1 hover:text-red-400 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl"
                  />
                </div>

                {/* Friends list */}
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {filteredFriends && filteredFriends.length > 0 ? (
                    filteredFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between rounded-2xl bg-slate-800/30 border border-slate-700/50 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={friend.avatarUrl || undefined} />
                            <AvatarFallback className="bg-slate-700 text-slate-300">{friend.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">{friend.name}</p>
                            <p className="text-sm text-slate-400">@{friend.username}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addMember(friend)}
                          className="rounded-full border-violet-500/50 text-violet-300 hover:bg-violet-500/20"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-sm text-slate-400">
                      {friends?.length === 0
                        ? "Add friends to invite them to pacts"
                        : "No friends match your search"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="rounded-full border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="flex-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg shadow-amber-500/20"
                onClick={handleSubmit}
                disabled={createGroupMutation.isPending}
              >
                {createGroupMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Pact
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
