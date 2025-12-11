"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Download, Volume2, VolumeX, Play, Pause } from "lucide-react";
import { AudioPlayer } from "@/components/ui/audio-player";

// Visually hidden component for accessibility
function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        borderWidth: "0",
      }}
    >
      {children}
    </span>
  );
}

interface ProofMediaViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO" | "AUDIO";
  caption?: string | null;
  uploaderName?: string;
  allMedia?: { url: string; type: "IMAGE" | "VIDEO" | "AUDIO"; caption?: string | null }[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

export function ProofMediaViewer({
  open,
  onOpenChange,
  mediaUrl,
  mediaType,
  caption,
  uploaderName,
  allMedia,
  currentIndex = 0,
  onNavigate,
}: ProofMediaViewerProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const hasNavigation = allMedia && allMedia.length > 1;
  const canGoBack = hasNavigation && currentIndex > 0;
  const canGoForward = hasNavigation && currentIndex < (allMedia?.length || 0) - 1;

  const handlePrevious = useCallback(() => {
    if (canGoBack && onNavigate) {
      onNavigate(currentIndex - 1);
    }
  }, [canGoBack, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (canGoForward && onNavigate) {
      onNavigate(currentIndex + 1);
    }
  }, [canGoForward, currentIndex, onNavigate]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handlePrevious, handleNext, onOpenChange]);

  const togglePlay = () => {
    if (mediaType === "VIDEO" && videoRef) {
      if (isPlaying) {
        videoRef.pause();
      } else {
        videoRef.play();
      }
      setIsPlaying(!isPlaying);
    } else if (mediaType === "AUDIO" && audioRef) {
      if (isPlaying) {
        audioRef.pause();
      } else {
        audioRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef) {
      videoRef.muted = !isMuted;
    }
    if (audioRef) {
      audioRef.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = mediaUrl;
    link.download = `proof-${Date.now()}.${mediaType.toLowerCase()}`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Proof Media Viewer</DialogTitle>
        </VisuallyHidden>

        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Navigation arrows */}
        {hasNavigation && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className={`absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12 ${
                !canGoBack ? "opacity-30 cursor-not-allowed" : ""
              }`}
              onClick={handlePrevious}
              disabled={!canGoBack}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12 ${
                !canGoForward ? "opacity-30 cursor-not-allowed" : ""
              }`}
              onClick={handleNext}
              disabled={!canGoForward}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Media content */}
        <div className="flex items-center justify-center min-h-[50vh] max-h-[85vh] p-4">
          {mediaType === "IMAGE" && (
            <img
              src={mediaUrl}
              alt={caption || "Proof image"}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {mediaType === "VIDEO" && (
            <div className="relative">
              <video
                ref={setVideoRef}
                src={mediaUrl}
                className="max-w-full max-h-[80vh] rounded-lg"
                controls={false}
                muted={isMuted}
                onClick={togglePlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              {/* Video controls overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-4 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-8 w-8"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-8 w-8"
                  onClick={toggleMute}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {mediaType === "AUDIO" && (
            <div className="w-full max-w-md">
              <AudioPlayer
                src={mediaUrl}
                caption={caption}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Caption and controls bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-end justify-between">
            <div className="flex-1 min-w-0">
              {uploaderName && (
                <p className="text-white/70 text-sm mb-1">{uploaderName}</p>
              )}
              {caption && (
                <p className="text-white text-sm line-clamp-2">{caption}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleDownload}
              >
                <Download className="h-5 w-5" />
              </Button>
              {hasNavigation && (
                <span className="text-white/70 text-sm">
                  {currentIndex + 1} / {allMedia?.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
