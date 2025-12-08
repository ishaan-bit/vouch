"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { toast } from "sonner";
import {
  Heart,
  CheckCircle2,
  X,
  Upload,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CauseLoss {
  id: string;
  amount: number;
  status: "PLEDGED" | "DONATED" | "SKIPPED";
  note: string | null;
  proofUrl: string | null;
  createdAt: string;
  group?: { id: string; name: string } | null;
  rule?: { id: string; title: string } | null;
}

interface VouchForCausePromptProps {
  causeLoss: CauseLoss;
  onClose?: () => void;
}

// Legal disclaimer that must be shown on all Vouch for a Cause screens
export const CAUSE_DISCLAIMER = `Vouch does not hold or transfer your money. Any donations or payments happen outside the app and are your own responsibility. This is a self-accountability feature, not a financial service. Please comply with local laws and consult independent legal/financial advice if needed.`;

export function VouchForCausePrompt({ causeLoss, onClose }: VouchForCausePromptProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const formatAmount = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

  const updateMutation = useMutation({
    mutationFn: async ({ status, note, proofUrl }: { status: string; note?: string; proofUrl?: string }) => {
      const res = await fetch(`/api/cause-losses/${causeLoss.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note, proofUrl }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cause-losses"] });
      toast.success("Thank you for vouching for a cause!");
      setOpen(false);
      onClose?.();
    },
    onError: () => {
      toast.error("Failed to save. Please try again.");
    },
  });

  const handleDonated = () => {
    if (!note.trim()) {
      toast.error("Please describe where/how you donated");
      return;
    }
    updateMutation.mutate({ status: "DONATED", note, proofUrl: proofUrl || undefined });
  };

  const handleSkip = () => {
    updateMutation.mutate({ status: "SKIPPED" });
    setOpen(false);
    onClose?.();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const { url } = await res.json();
      setProofUrl(url);
      toast.success("Image uploaded!");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) onClose?.();
    }}>
      <BottomSheetContent className="bg-slate-900/95 border-slate-700/50 backdrop-blur-xl max-h-[90vh] overflow-y-auto">
        <BottomSheetHeader className="pb-4">
          <BottomSheetTitle className="text-xl text-white flex items-center gap-2">
            <Heart className="h-6 w-6 text-pink-400" />
            Vouch for a Cause
          </BottomSheetTitle>
        </BottomSheetHeader>

        <div className="space-y-5 py-4">
          {/* Amount lost */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/20 to-orange-500/10 border border-pink-500/20 text-center">
            <p className="text-sm text-pink-300 mb-1">You lost on your own rule</p>
            <p className="text-3xl font-bold text-white">{formatAmount(causeLoss.amount)}</p>
            {causeLoss.rule && (
              <p className="text-sm text-slate-400 mt-2">"{causeLoss.rule.title}"</p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <p className="text-slate-300 text-sm leading-relaxed">
              Instead of this going to "the house", we encourage you to take this amount 
              and donate it to a cause that matters to you, or spend it doing something 
              good in the world.
            </p>
            <p className="text-slate-400 text-sm">
              Then come back and log your experience to share your impact!
            </p>
          </div>

          {/* Donation form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">
                Where/how did you donate or spend for good?
              </Label>
              <Textarea
                placeholder="e.g., Donated to local food bank, bought meals for street kids, contributed to an NGO..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[100px] bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl"
              />
            </div>

            {/* Optional proof upload */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                Optional: Upload a photo (receipt, moment, etc.)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="bg-slate-800/50 border-slate-700/50 text-white file:bg-violet-500/20 file:text-violet-300 file:border-0 file:rounded-lg"
                />
                {isUploading && <Loader2 className="h-5 w-5 animate-spin text-violet-400" />}
              </div>
              {proofUrl && (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-700">
                  <img src={proofUrl} alt="Proof" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setProofUrl("")}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80 leading-relaxed">
                {CAUSE_DISCLAIMER}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={updateMutation.isPending}
              className="flex-1 border-slate-700 text-slate-400 hover:bg-slate-800 rounded-xl"
            >
              Skip for now
            </Button>
            <Button
              onClick={handleDonated}
              disabled={updateMutation.isPending || !note.trim()}
              className="flex-1 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white border-0 rounded-xl"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              I Donated!
            </Button>
          </div>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}

// Profile section component for showing user's cause donations
interface VouchForCauseProfileSectionProps {
  userId: string;
  isOwnProfile: boolean;
}

export function VouchForCauseProfileSection({ userId, isOwnProfile }: VouchForCauseProfileSectionProps) {
  const { data: causeLosses, isLoading } = useQuery<CauseLoss[]>({
    queryKey: ["cause-losses", userId],
    queryFn: async () => {
      const res = await fetch("/api/cause-losses");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOwnProfile, // Only fetch for own profile for now
  });

  const donatedLosses = causeLosses?.filter((cl) => cl.status === "DONATED") || [];

  if (!isOwnProfile || donatedLosses.length === 0) {
    return null;
  }

  const formatAmount = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
  const totalDonated = donatedLosses.reduce((sum, cl) => sum + cl.amount, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
          <Heart className="h-4 w-4 text-pink-400" />
          Vouch for a Cause
        </h3>
        <span className="text-xs text-pink-400">
          {donatedLosses.length} donation{donatedLosses.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Summary card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-orange-500/5 border border-pink-500/20">
        <div className="text-center">
          <p className="text-sm text-pink-300 mb-1">Total donated to causes</p>
          <p className="text-2xl font-bold text-white">{formatAmount(totalDonated)}</p>
        </div>
      </div>

      {/* Recent donations */}
      <div className="space-y-2">
        {donatedLosses.slice(0, 3).map((cl) => (
          <div
            key={cl.id}
            className={cn(
              "p-3 rounded-xl bg-slate-900/50 border border-slate-800/50",
              "hover:border-pink-500/30 transition-all"
            )}
          >
            <div className="flex items-start gap-3">
              {cl.proofUrl ? (
                <img
                  src={cl.proofUrl}
                  alt="Donation"
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-pink-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white line-clamp-2">{cl.note || "Donation logged"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-pink-400">{formatAmount(cl.amount)}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(cl.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-slate-500 leading-relaxed px-1">
        {CAUSE_DISCLAIMER}
      </p>
    </div>
  );
}
