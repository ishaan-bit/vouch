"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, Save, User, ScrollText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface EditProfileContentProps {
  userId: string;
}

interface UserProfile {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  upiId: string | null;
}

export function EditProfileContent({ userId }: EditProfileContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [upiId, setUpiId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch current profile
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setUpiId(profile.upiId || "");
      setAvatarUrl(profile.avatarUrl);
    }
  }, [profile]);

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          username: username.trim() || undefined,
          bio: bio.trim() || undefined,
          upiId: upiId.trim() || undefined,
          avatarUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated!");
      router.push("/profile");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "avatars");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      // Get response text first, then try to parse as JSON
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Upload failed: ${text || "Unknown error"}`);
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      setAvatarUrl(data.url);
      toast.success("Avatar uploaded!");
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-lilac)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6">
      {/* Header */}
      <div className="relative pt-6 mb-8">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[var(--accent-violet)]/20 blur-[60px] rounded-full" />

        <div className="relative flex items-center gap-4">
          <Link href="/profile">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-white via-[var(--accent-lilac)] to-white bg-clip-text text-transparent">
                Edit Profile
              </span>
            </h1>
            <p className="text-white/40 text-sm">Update your information</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-[var(--accent-violet)]/30">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white text-2xl">
                {name?.[0] || <User className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={cn(
                "absolute -bottom-1 -right-1 p-2 rounded-full",
                "bg-[var(--accent-violet)] text-white",
                "hover:bg-[var(--accent-magenta)] transition-colors",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <p className="text-xs text-white/40">Tap to change avatar</p>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-white/90">
            Display Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className={cn(
              "bg-[var(--dusk-2)]/80 border-white/10",
              "focus:border-[var(--accent-violet)]/50 focus:ring-[var(--accent-violet)]/20",
              "text-white placeholder:text-white/30"
            )}
          />
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username" className="text-white/90">
            Username
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
              @
            </span>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="username"
              className={cn(
                "pl-8 bg-[var(--dusk-2)]/80 border-white/10",
                "focus:border-[var(--accent-violet)]/50 focus:ring-[var(--accent-violet)]/20",
                "text-white placeholder:text-white/30"
              )}
            />
          </div>
          <p className="text-xs text-white/40">
            3-20 characters, letters, numbers, and underscores only
          </p>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-white/90">
            Bio
          </Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            rows={3}
            className={cn(
              "bg-[var(--dusk-2)]/80 border-white/10 resize-none",
              "focus:border-[var(--accent-violet)]/50 focus:ring-[var(--accent-violet)]/20",
              "text-white placeholder:text-white/30"
            )}
          />
        </div>

        {/* UPI ID */}
        <div className="space-y-2">
          <Label htmlFor="upiId" className="text-white/90">
            UPI ID (for payouts)
          </Label>
          <Input
            id="upiId"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@upi"
            className={cn(
              "bg-[var(--dusk-2)]/80 border-white/10",
              "focus:border-[var(--accent-violet)]/50 focus:ring-[var(--accent-violet)]/20",
              "text-white placeholder:text-white/30"
            )}
          />
          <p className="text-xs text-white/40">
            Used for receiving stake winnings
          </p>
        </div>

        {/* Rules of Vouch Club */}
        <div className="pt-4 border-t border-white/10">
          <Link href="/rules" className="block">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-red-900/20 to-amber-900/20 border border-amber-900/20 hover:from-red-900/30 hover:to-amber-900/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center">
                  <ScrollText className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium text-amber-100">Rules of Vouch Club</p>
                  <p className="text-xs text-amber-500/70">The 8 rules you live by</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-500/50" />
            </div>
          </Link>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={updateMutation.isPending || isUploading}
          className={cn(
            "w-full py-6 rounded-xl font-semibold",
            "bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)]",
            "hover:opacity-90 transition-opacity",
            "disabled:opacity-50"
          )}
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Save Changes
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
