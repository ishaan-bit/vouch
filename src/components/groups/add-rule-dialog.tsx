"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Users, AlertCircle, Coins } from "lucide-react";

interface AddRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

const STAKE_PRESETS = [50, 100, 500, 1000, 2000];
const MIN_STAKE = 1;
const MAX_STAKE = 100000;

export function AddRuleDialog({ 
  open, 
  onOpenChange, 
  groupId, 
}: AddRuleDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stakeAmount, setStakeAmount] = useState("100");
  const [stakeError, setStakeError] = useState("");

  const validateStake = (value: string): boolean => {
    const num = parseFloat(value);
    
    if (value === "" || isNaN(num)) {
      setStakeError("Please enter a valid amount");
      return false;
    }
    
    if (num < MIN_STAKE) {
      setStakeError(`Minimum stake is ₹${MIN_STAKE}`);
      return false;
    }
    
    if (num > MAX_STAKE) {
      setStakeError(`Maximum stake is ₹${MAX_STAKE.toLocaleString("en-IN")}`);
      return false;
    }
    
    setStakeError("");
    return true;
  };

  const handleStakeChange = (value: string) => {
    setStakeAmount(value);
    if (value) {
      validateStake(value);
    } else {
      setStakeError("");
    }
  };

  const handlePresetClick = (amount: number) => {
    setStakeAmount(String(amount));
    setStakeError("");
  };

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          stakeAmount: Math.round(parseFloat(stakeAmount) * 100), // Convert to paise
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create rule");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate multiple queries to ensure UI refresh
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      toast.success("Rule added!");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStakeAmount("100");
    setStakeError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Please enter a rule title");
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter a rule description");
      return;
    }
    
    if (!validateStake(stakeAmount)) {
      return;
    }

    createRuleMutation.mutate();
  };

  return (
    <BottomSheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <BottomSheetContent className="bg-slate-900/95 border-slate-700/50 backdrop-blur-xl max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <BottomSheetHeader className="pb-4">
            <BottomSheetTitle className="text-xl text-white">Create Your Rule</BottomSheetTitle>
            <p className="text-sm text-slate-400 mt-1">
              Everyone in this group will try to follow this rule. You&apos;ll pay them if they follow it.
            </p>
          </BottomSheetHeader>
          
          <div className="space-y-5 py-4">
            {/* Info banner */}
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
              <Users className="h-5 w-5 text-violet-400 mt-0.5 shrink-0" />
              <p className="text-xs text-violet-200">
                This rule applies to <strong>everyone</strong> in the pact, including you. If others follow your rule, you pay them.
              </p>
            </div>

            {/* Rule Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-300">Rule Title</Label>
              <Input
                id="title"
                placeholder="e.g., Morning workout before 8am"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
                className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl focus:ring-violet-500 focus:border-violet-500"
              />
            </div>

            {/* Rule Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300">Details</Label>
              <Textarea
                id="description"
                placeholder="e.g., Post a gym selfie or workout screenshot as proof every day"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl focus:ring-violet-500 focus:border-violet-500"
                maxLength={200}
              />
              <p className="text-xs text-slate-500">
                {description.length}/200 characters
              </p>
            </div>
            
            {/* Stake Amount */}
            <div className="space-y-3">
              <Label htmlFor="stake" className="text-slate-300 flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Stake Amount
              </Label>
              
              {/* Numeric input */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 font-medium">
                  ₹
                </span>
                <Input
                  id="stake"
                  type="number"
                  min={MIN_STAKE}
                  max={MAX_STAKE}
                  step="1"
                  value={stakeAmount}
                  onChange={(e) => handleStakeChange(e.target.value)}
                  className={`pl-8 bg-slate-800/50 border-slate-700/50 text-white rounded-xl focus:ring-amber-500 focus:border-amber-500 ${
                    stakeError ? "border-red-500 ring-1 ring-red-500" : ""
                  }`}
                />
              </div>
              
              {stakeError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {stakeError}
                </div>
              )}
              
              <p className="text-xs text-slate-500">
                You&apos;ll pay this to each member who follows your rule (₹{MIN_STAKE}–₹{MAX_STAKE.toLocaleString("en-IN")})
              </p>
            </div>

            {/* Quick amount buttons */}
            <div className="flex gap-2 flex-wrap">
              {STAKE_PRESETS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handlePresetClick(amount)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    stakeAmount === String(amount)
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20"
                      : "bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:border-amber-500/50"
                  }`}
                >
                  ₹{amount.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
            
            {/* Stake preview */}
            {stakeAmount && !stakeError && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                <p className="text-sm text-amber-200">
                  If all 3 members follow this rule, you&apos;ll pay
                </p>
                <p className="text-2xl font-bold text-amber-400 mt-1">
                  ₹{(parseFloat(stakeAmount) * 3).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-amber-300/60 mt-1">
                  (example with 3 members)
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 pb-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl min-h-[48px] touch-action-manipulation"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createRuleMutation.isPending || !!stakeError}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 rounded-xl shadow-lg shadow-amber-500/20 min-h-[48px] touch-action-manipulation"
            >
              {createRuleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Rule
            </Button>
          </div>
        </form>
      </BottomSheetContent>
    </BottomSheet>
  );
}
