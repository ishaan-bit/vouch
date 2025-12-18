"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upload } from "@vercel/blob/client";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Loader2,
  Camera,
  Video,
  FileText,
  Link as LinkIcon,
  Upload,
  X,
  CheckCircle,
  Globe,
  Mic,
  Play,
  Pause,
  Square,
  Clock,
  Image as ImageIcon,
} from "lucide-react";

interface Rule {
  id: string;
  title: string;
  description: string;
}

interface AddProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName?: string;
  dayIndex?: number;
  rules: Rule[];
}

type MediaType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "LINK";

const mediaTypes = [
  { type: "TEXT" as const, icon: FileText, label: "Text" },
  { type: "IMAGE" as const, icon: Camera, label: "Photo" },
  { type: "VIDEO" as const, icon: Video, label: "Video" },
  { type: "AUDIO" as const, icon: Mic, label: "Audio" },
  { type: "LINK" as const, icon: LinkIcon, label: "Link" },
];

export function AddProofDialog({
  open,
  onOpenChange,
  groupId,
  groupName = "Group",
  dayIndex = 1,
  rules,
}: AddProofDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [mediaType, setMediaType] = useState<MediaType>("TEXT");
  const [textContent, setTextContent] = useState("");
  const [caption, setCaption] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [isStory, setIsStory] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const resetForm = () => {
    setMediaType("TEXT");
    setTextContent("");
    setCaption("");
    setLinkUrl("");
    setSelectedRuleIds([]);
    setIsPublic(true);
    setIsStory(false);
    setFile(null);
    setFilePreview(null);
    setAudioUrl(null);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  };

  // Audio recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "voice-proof.webm", { type: "audio/webm" });
        setFile(audioFile);
        setAudioUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type based on mediaType
    if (mediaType === "IMAGE" && !selectedFile.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (mediaType === "VIDEO" && !selectedFile.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    // Validate size (50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 50MB");
      return;
    }

    setFile(selectedFile);

    // Create preview for images and videos
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type.startsWith("video/")) {
      // Create object URL for video preview
      setFilePreview(URL.createObjectURL(selectedFile));
    } else {
      setFilePreview(null);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!file) return null;

    setIsUploading(true);
    try {
      // Use client-side upload for videos (bypasses serverless body limit)
      const isVideo = file.type.startsWith("video/");
      const isLargeFile = file.size > 4 * 1024 * 1024; // > 4MB
      
      if (isVideo || isLargeFile) {
        // Use client upload for large files
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload/client",
        });
        return blob.url;
      }
      
      // Use server upload for smaller files (images, audio)
      const formData = new FormData();
      formData.append("file", file);

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
        throw new Error(data.error || "Upload failed");
      }

      return data.url;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const createProofMutation = useMutation({
    mutationFn: async () => {
      let mediaUrl: string | null = null;

      // Upload file if present (image, video, or audio)
      if (file && (mediaType === "IMAGE" || mediaType === "VIDEO" || mediaType === "AUDIO")) {
        mediaUrl = await uploadFile();
      }

      // For links, use the URL directly
      if (mediaType === "LINK") {
        mediaUrl = linkUrl;
      }

      const res = await fetch(`/api/groups/${groupId}/proofs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayIndex,
          caption: caption || undefined,
          mediaType,
          mediaUrl: mediaUrl || undefined,
          textContent: mediaType === "TEXT" ? textContent : undefined,
          ruleIds: selectedRuleIds,
          isPublic,
          isStory,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to post proof");
      }

      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh UI - use broader invalidation to catch all day filters
      queryClient.invalidateQueries({ queryKey: ["proofs"] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["my-groups"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Proof posted!");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleRule = (ruleId: string) => {
    setSelectedRuleIds((prev) =>
      prev.includes(ruleId)
        ? prev.filter((id) => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedRuleIds.length === 0) {
      toast.error("Select at least one rule this proof supports");
      return;
    }

    if (mediaType === "TEXT" && !textContent.trim()) {
      toast.error("Please enter your text proof");
      return;
    }

    if ((mediaType === "IMAGE" || mediaType === "VIDEO") && !file) {
      toast.error(`Please select a ${mediaType.toLowerCase()} file`);
      return;
    }

    if (mediaType === "AUDIO" && !file) {
      toast.error("Please record an audio proof");
      return;
    }

    if (mediaType === "LINK" && !linkUrl.trim()) {
      toast.error("Please enter a link URL");
      return;
    }

    createProofMutation.mutate();
  };

  const isSubmitting = createProofMutation.isPending || isUploading;

  return (
    <BottomSheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <BottomSheetContent className="bg-slate-900/95 border-slate-700/50 backdrop-blur-xl max-h-[85vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <BottomSheetHeader className="pb-4">
            <BottomSheetTitle className="text-xl text-white">Post Proof</BottomSheetTitle>
            <p className="text-sm text-slate-400 mt-1">
              Day {dayIndex} of {groupName}
            </p>
          </BottomSheetHeader>

          <div className="space-y-5 py-4">
            {/* Media Type Selection */}
            <div className="space-y-2">
              <Label className="text-slate-300">Proof Type</Label>
              <div className="flex gap-2">
                {mediaTypes.map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setMediaType(type);
                      setFile(null);
                      setFilePreview(null);
                    }}
                    className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                      mediaType === type
                        ? "bg-violet-500/20 border-2 border-violet-500 text-violet-300"
                        : "bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:border-violet-500/50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content based on media type */}
            {mediaType === "TEXT" && (
              <div className="space-y-2">
                <Label htmlFor="textContent" className="text-slate-300">
                  Your Proof
                </Label>
                <Textarea
                  id="textContent"
                  placeholder="Describe what you did..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="min-h-[120px] bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl"
                  maxLength={2000}
                />
                <p className="text-xs text-slate-500 text-right">
                  {textContent.length}/2000
                </p>
              </div>
            )}

            {(mediaType === "IMAGE" || mediaType === "VIDEO") && (
              <div className="space-y-3">
                <Label className="text-slate-300">
                  Upload {mediaType === "IMAGE" ? "Photo" : "Video"}
                </Label>

                {/* Hidden file inputs - one for gallery, one for camera */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={mediaType === "IMAGE" ? "image/*" : "video/*"}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept={mediaType === "IMAGE" ? "image/*" : "video/*"}
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {file ? (
                  <div className="relative rounded-2xl overflow-hidden bg-slate-800/50 border border-slate-700/50">
                    {filePreview && mediaType === "IMAGE" ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                      />
                    ) : filePreview && mediaType === "VIDEO" ? (
                      <video
                        src={filePreview}
                        controls
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="h-32 flex items-center justify-center">
                        <Video className="h-12 w-12 text-slate-500" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-sm text-white truncate">{file.name}</p>
                      <p className="text-xs text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // Revoke object URL to prevent memory leaks
                        if (filePreview && mediaType === "VIDEO") {
                          URL.revokeObjectURL(filePreview);
                        }
                        setFile(null);
                        setFilePreview(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Camera capture button */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="h-28 rounded-2xl border-2 border-dashed border-violet-500/50 hover:border-violet-500 bg-violet-500/10 hover:bg-violet-500/20 flex flex-col items-center justify-center gap-2 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-violet-500/30 flex items-center justify-center">
                        <Camera className="h-5 w-5 text-violet-400" />
                      </div>
                      <span className="text-sm text-violet-300 font-medium">
                        {mediaType === "IMAGE" ? "Take Photo" : "Record Video"}
                      </span>
                    </button>
                    
                    {/* Gallery/file upload button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-28 rounded-2xl border-2 border-dashed border-slate-700 hover:border-slate-500 bg-slate-800/30 hover:bg-slate-800/50 flex flex-col items-center justify-center gap-2 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center">
                        {mediaType === "IMAGE" ? (
                          <ImageIcon className="h-5 w-5 text-slate-400" />
                        ) : (
                          <Upload className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <span className="text-sm text-slate-400">
                        From Gallery
                      </span>
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-500 text-center">Max 50MB</p>

                {/* Caption */}
                <div className="space-y-2">
                  <Label htmlFor="caption" className="text-slate-300">
                    Caption (optional)
                  </Label>
                  <Input
                    id="caption"
                    placeholder="Add a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl"
                    maxLength={500}
                  />
                </div>
              </div>
            )}

            {mediaType === "LINK" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="linkUrl" className="text-slate-300">
                    Link URL
                  </Label>
                  <Input
                    id="linkUrl"
                    type="url"
                    placeholder="https://open.spotify.com/..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl"
                  />
                  <p className="text-xs text-slate-500">
                    Paste a Spotify, YouTube, or any URL as proof
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="caption" className="text-slate-300">
                    Description (optional)
                  </Label>
                  <Input
                    id="caption"
                    placeholder="What is this link about?"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl"
                    maxLength={500}
                  />
                </div>
              </div>
            )}

            {mediaType === "AUDIO" && (
              <div className="space-y-3">
                <Label className="text-slate-300">Record Audio Proof</Label>

                {audioUrl ? (
                  <div className="relative rounded-2xl overflow-hidden bg-slate-800/50 border border-slate-700/50 p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <Mic className="h-6 w-6 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">Voice Recording</p>
                        <audio src={audioUrl} controls className="w-full mt-2" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setAudioUrl(null);
                        audioChunksRef.current = [];
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : isRecording ? (
                  <div className="w-full h-32 rounded-2xl border-2 border-red-500 bg-red-500/10 flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                      <Mic className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-red-400 font-medium">
                      Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
                    </p>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <Square className="h-4 w-4" />
                      <span>Stop</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-700 hover:border-violet-500/50 bg-slate-800/30 flex flex-col items-center justify-center gap-2 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <Mic className="h-6 w-6 text-violet-400" />
                    </div>
                    <span className="text-sm text-slate-400">
                      Tap to start recording
                    </span>
                    <span className="text-xs text-slate-500">Record a voice proof</span>
                  </button>
                )}

                {/* Caption */}
                <div className="space-y-2">
                  <Label htmlFor="audioCaption" className="text-slate-300">
                    Caption (optional)
                  </Label>
                  <Input
                    id="audioCaption"
                    placeholder="Add a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl"
                    maxLength={500}
                  />
                </div>
              </div>
            )}

            {/* Rule Selection */}
            <div className="space-y-3">
              <Label className="text-slate-300">
                Which rules does this prove?
              </Label>
              <div className="space-y-2">
                {rules.map((rule) => (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => toggleRule(rule.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                      selectedRuleIds.includes(rule.id)
                        ? "bg-violet-500/20 border border-violet-500"
                        : "bg-slate-800/50 border border-slate-700/50 hover:border-violet-500/50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedRuleIds.includes(rule.id)
                          ? "bg-violet-500 border-violet-500"
                          : "border-slate-600"
                      }`}
                    >
                      {selectedRuleIds.includes(rule.id) && (
                        <CheckCircle className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">
                        {rule.title || rule.description}
                      </p>
                      {rule.title && (
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {rule.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Public toggle */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <Checkbox
                id="isPublic"
                checked={isPublic}
                onCheckedChange={(checked: boolean | "indeterminate") => setIsPublic(checked === true)}
                className="border-slate-600 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
              />
              <div className="flex-1">
                <Label
                  htmlFor="isPublic"
                  className="text-white cursor-pointer flex items-center gap-2"
                >
                  <Globe className="h-4 w-4 text-slate-400" />
                  Show on my public profile
                </Label>
                <p className="text-xs text-slate-500">
                  Others can see this proof on your profile page
                </p>
              </div>
            </div>

            {/* Story toggle */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
              <Checkbox
                id="isStory"
                checked={isStory}
                onCheckedChange={(checked: boolean | "indeterminate") => setIsStory(checked === true)}
                className="border-amber-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
              />
              <div className="flex-1">
                <Label
                  htmlFor="isStory"
                  className="text-white cursor-pointer flex items-center gap-2"
                >
                  <Clock className="h-4 w-4 text-amber-400" />
                  Post as Story (24h)
                </Label>
                <p className="text-xs text-slate-500">
                  Ephemeral post that disappears after 24 hours
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 pb-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl min-h-[48px] touch-action-manipulation"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 rounded-xl shadow-lg shadow-violet-500/20 min-h-[48px] touch-action-manipulation"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? "Uploading..." : "Post Proof"}
            </Button>
          </div>
        </form>
      </BottomSheetContent>
    </BottomSheet>
  );
}
