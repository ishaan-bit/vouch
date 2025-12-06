"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Send,
  Mic,
  X,
  Loader2,
  Paperclip,
  Play,
  Pause,
  Square,
  FileAudio,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { useSocket } from "@/components/providers/socket-provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string | null;
  type: string;
  mediaUrl?: string;
  mediaType?: string;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

interface ChatBoxProps {
  type: "dm" | "group";
  id: string;
  recipientId?: string;
}

type MediaType = "IMAGE" | "VIDEO" | "AUDIO" | null;

export function ChatBox({ type, id, recipientId }: ChatBoxProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Socket is disabled on serverless - just get the no-op functions
  const { sendMessage: socketSend } = useSocket();

  // Fetch messages with polling (30s interval for cost efficiency)
  const { data, isLoading } = useQuery({
    queryKey: ["messages", type, id],
    queryFn: async () => {
      const endpoint = type === "dm" ? `/api/messages/dm/${id}` : `/api/messages/group/${id}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 30000, // Poll every 30 seconds instead of real-time
    refetchOnWindowFocus: true,
  });

  const messages: Message[] = data?.messages || [];

  // Socket rooms disabled on serverless - polling handles updates instead

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Upload file to server
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Upload failed");
    }

    const { url } = await res.json();
    return url;
  };

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async ({ content, mediaUrl, mediaType }: { content?: string; mediaUrl?: string; mediaType?: string }) => {
      // For DMs, use the thread-specific endpoint to avoid needing recipientId
      const endpoint = type === "dm" ? `/api/messages/dm/${id}` : `/api/messages/group/${id}`;
      const body = { content, mediaUrl, mediaType };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData(
        ["messages", type, id],
        (old: { messages: Message[]; nextCursor: string | null } | undefined) => ({
          messages: [...(old?.messages || []), newMsg],
          nextCursor: old?.nextCursor || null,
        })
      );
      socketSend({
        ...(type === "dm" ? { threadId: id } : { groupId: id }),
        message: newMsg,
      });
      setMessage("");
      setSelectedFile(null);
      setFilePreview(null);
      setMediaType(null);
      setAudioBlob(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile && !audioBlob) || sendMutation.isPending || isUploading) return;

    setIsUploading(true);
    try {
      let mediaUrl: string | undefined;
      let sendMediaType: string | undefined;

      // Handle file upload
      if (selectedFile) {
        mediaUrl = await uploadFile(selectedFile);
        sendMediaType = mediaType || "IMAGE";
      }

      // Handle audio blob
      if (audioBlob) {
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        mediaUrl = await uploadFile(audioFile);
        sendMediaType = "AUDIO";
      }

      await sendMutation.mutateAsync({
        content: message.trim() || undefined,
        mediaUrl,
        mediaType: sendMediaType,
      });
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine media type
    if (file.type.startsWith("image/")) {
      setMediaType("IMAGE");
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      setMediaType("VIDEO");
      setFilePreview(URL.createObjectURL(file));
    } else if (file.type.startsWith("audio/")) {
      setMediaType("AUDIO");
      setFilePreview(null);
    } else {
      toast.error("Unsupported file type");
      return;
    }

    setSelectedFile(file);
    setAudioBlob(null);
  };

  const clearAttachment = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setMediaType(null);
    setAudioBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (error) {
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioBlob(null);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return `Yesterday ${format(date, "HH:mm")}`;
    return format(date, "MMM d, HH:mm");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-lilac)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--dusk-1)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-white/40 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.sender.id === session?.user?.id;
            const showAvatar = index === 0 || messages[index - 1].sender.id !== msg.sender.id;

            return (
              <div key={msg.id} className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
                {showAvatar ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.sender.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-magenta)] text-white text-xs">
                      {msg.sender.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-8" />
                )}

                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl overflow-hidden",
                    isOwn
                      ? "bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)] rounded-br-sm"
                      : "bg-[var(--dusk-3)] rounded-bl-sm"
                  )}
                >
                  {/* Media Content */}
                  {msg.mediaUrl && (
                    <MediaPreview
                      url={msg.mediaUrl}
                      type={msg.mediaType || msg.type}
                      isOwn={isOwn}
                    />
                  )}
                  
                  {/* Text Content */}
                  {msg.content && (
                    <div className="px-4 py-2">
                      {type === "group" && !isOwn && showAvatar && (
                        <p className="text-xs font-medium mb-1 opacity-70 text-white">
                          {msg.sender.name}
                        </p>
                      )}
                      <p className="text-sm text-white">{msg.content}</p>
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  <p className={cn(
                    "text-[10px] px-4 pb-2",
                    isOwn ? "text-white/60" : "text-white/40"
                  )}>
                    {formatMessageDate(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview */}
      {(selectedFile || audioBlob) && (
        <div className="px-4 py-2 border-t border-white/10 bg-[var(--dusk-2)]">
          <div className="flex items-center gap-3">
            {mediaType === "IMAGE" && filePreview && (
              <img src={filePreview} alt="Preview" className="h-16 w-16 object-cover rounded-lg" />
            )}
            {mediaType === "VIDEO" && filePreview && (
              <video src={filePreview} className="h-16 w-16 object-cover rounded-lg" />
            )}
            {(mediaType === "AUDIO" || audioBlob) && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--dusk-3)] rounded-lg">
                <FileAudio className="w-5 h-5 text-[var(--accent-lilac)]" />
                <span className="text-sm text-white/70">
                  {selectedFile?.name || "Voice message"}
                </span>
              </div>
            )}
            <div className="flex-1" />
            <button onClick={clearAttachment} className="p-1 hover:bg-white/10 rounded">
              <X className="w-5 h-5 text-white/50" />
            </button>
          </div>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="px-4 py-3 border-t border-white/10 bg-[var(--accent-magenta)]/10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[var(--accent-magenta)] animate-pulse" />
            <span className="text-sm text-white">Recording... {formatRecordingTime(recordingTime)}</span>
            <div className="flex-1" />
            <button onClick={cancelRecording} className="p-2 hover:bg-white/10 rounded text-white/60">
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={stopRecording}
              className="p-2 bg-[var(--accent-magenta)] rounded-full text-white"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input - sticky to viewport for mobile keyboard */}
      <div className="border-t border-white/10 p-3 sm:p-4 bg-[var(--dusk-2)] sticky bottom-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          {/* Attachment Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-white/50 hover:text-white hover:bg-white/10 min-w-[44px] min-h-[44px] touch-action-manipulation"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRecording}
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          {/* Mic Button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "shrink-0 transition-colors min-w-[44px] min-h-[44px] touch-action-manipulation",
              isRecording
                ? "text-[var(--accent-magenta)] bg-[var(--accent-magenta)]/20"
                : "text-white/50 hover:text-white hover:bg-white/10"
            )}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!!selectedFile || !!audioBlob}
          >
            <Mic className="h-5 w-5" />
          </Button>

          {/* Text Input - optimized for mobile keyboards */}
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isRecording}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            className={cn(
              "flex-1 bg-[var(--dusk-3)] border-white/10 text-white placeholder:text-white/30",
              "focus:ring-1 focus:ring-[var(--accent-violet)]/50",
              "text-base min-h-[44px]" // 16px base prevents iOS zoom, 44px touch target
            )}
          />

          {/* Send Button */}
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!message.trim() && !selectedFile && !audioBlob) || sendMutation.isPending || isUploading}
            className={cn(
              "shrink-0 bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)]",
              "hover:opacity-90 disabled:opacity-50",
              "min-w-[44px] min-h-[44px] touch-action-manipulation"
            )}
          >
            {(sendMutation.isPending || isUploading) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Media Preview Component
function MediaPreview({ url, type, isOwn }: { url: string; type: string; isOwn: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggleAudioPlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle audio end
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setIsPlaying(false);
      audio.addEventListener("ended", handleEnded);
      return () => audio.removeEventListener("ended", handleEnded);
    }
  }, []);

  if (type === "IMAGE" || (type === "MEDIA" && url.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
    return (
      <img
        src={url}
        alt="Message attachment"
        className="max-w-full cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => window.open(url, "_blank")}
      />
    );
  }

  if (type === "VIDEO" || url.match(/\.(mp4|webm|mov)$/i)) {
    return (
      <video
        src={url}
        controls
        className="max-w-full"
        playsInline
      />
    );
  }

  if (type === "AUDIO" || url.match(/\.(mp3|wav|ogg|webm|m4a)$/i)) {
    return (
      <div className="p-3 flex items-center gap-3 min-w-[200px]">
        <audio ref={audioRef} src={url} />
        <button
          onClick={toggleAudioPlay}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
            isOwn
              ? "bg-white/20 hover:bg-white/30"
              : "bg-[var(--accent-violet)]/20 hover:bg-[var(--accent-violet)]/30"
          )}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>
        <div className="flex-1">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white/60 rounded-full w-0" />
          </div>
        </div>
      </div>
    );
  }

  // Fallback for unknown types
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="p-3 flex items-center gap-2 text-white/70 hover:text-white">
      <Paperclip className="w-4 h-4" />
      <span className="text-sm underline">View attachment</span>
    </a>
  );
}
