"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type ReportType = "USER" | "MESSAGE" | "PROOF" | "GROUP";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ReportType;
  targetId: string;
  targetName?: string; // e.g., username, group name
}

const REPORT_REASONS: Record<ReportType, string[]> = {
  USER: [
    "Harassment or bullying",
    "Spam or fake account",
    "Inappropriate content",
    "Impersonation",
    "Other",
  ],
  MESSAGE: [
    "Harassment or bullying",
    "Spam",
    "Hate speech",
    "Inappropriate content",
    "Other",
  ],
  PROOF: [
    "Inappropriate content",
    "Fake or misleading",
    "Spam",
    "Violates group rules",
    "Other",
  ],
  GROUP: [
    "Inappropriate content",
    "Spam or scam",
    "Harassment",
    "Violates terms of service",
    "Other",
  ],
};

export function ReportDialog({
  open,
  onOpenChange,
  type,
  targetId,
  targetName,
}: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [details, setDetails] = useState("");

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReason) throw new Error("Please select a reason");
      
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          targetId,
          reason: selectedReason,
          details: details.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit report");
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success("Report submitted. Thank you for helping keep Vouch safe.");
      setSelectedReason("");
      setDetails("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getTitle = () => {
    switch (type) {
      case "USER":
        return `Report ${targetName || "User"}`;
      case "MESSAGE":
        return "Report Message";
      case "PROOF":
        return "Report Proof";
      case "GROUP":
        return `Report ${targetName || "Group"}`;
      default:
        return "Report";
    }
  };

  const reasons = REPORT_REASONS[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            Please select a reason for your report. Our team will review it and take appropriate action.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <RadioGroup
            value={selectedReason}
            onValueChange={setSelectedReason}
            className="space-y-2"
          >
            {reasons.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <RadioGroupItem value={reason} id={reason} />
                <Label htmlFor={reason} className="cursor-pointer">
                  {reason}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              placeholder="Provide any additional context that might help us understand the issue..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => reportMutation.mutate()}
            disabled={!selectedReason || reportMutation.isPending}
            variant="destructive"
          >
            {reportMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
