"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AudioPlayer } from "@/components/ui/audio-player";

interface Story {
  id: string;
  caption: string | null;
  mediaType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "LINK";
  mediaUrl: string | null;
  textContent: string | null;
  createdAt: string;
  expiresAt: string | null;
  uploader: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  ruleLinks: Array<{
    rule: {
      id: string;
      description: string;
    };
  }>;
}

interface StoriesRingProps {
  groupId: string;
  className?: string;
}

// Story ring preview component for group header
export function StoriesRing({ groupId, className }: StoriesRingProps) {
  const [showViewer, setShowViewer] = useState(false);

  const { data: stories = [] } = useQuery<Story[]>({
    queryKey: ["stories", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${groupId}/proofs?stories=true`);
      if (!res.ok) throw new Error("Failed to fetch stories");
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30s to check for expired stories
  });

  // Group stories by user
  const storiesByUser = stories.reduce((acc, story) => {
    const userId = story.uploader.id;
    if (!acc[userId]) {
      acc[userId] = {
        user: story.uploader,
        stories: [],
      };
    }
    acc[userId].stories.push(story);
    return acc;
  }, {} as Record<string, { user: Story["uploader"]; stories: Story[] }>);

  const userStories = Object.values(storiesByUser);

  if (userStories.length === 0) return null;

  return (
    <>
      <div className={cn("flex gap-3 overflow-x-auto pb-2", className)}>
        {userStories.map(({ user, stories }) => (
          <button
            key={user.id}
            onClick={() => setShowViewer(true)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="relative">
              {/* Gradient ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-pink-500 p-[3px]">
                <div className="w-full h-full rounded-full bg-slate-900" />
              </div>
              {/* Avatar */}
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-[3px] border-slate-900">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg">
                    {user.name?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              {/* Story count badge */}
              {stories.length > 1 && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                  {stories.length}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-400 truncate max-w-[56px]">
              {user.name?.split(" ")[0] || "User"}
            </span>
          </button>
        ))}
      </div>

      {showViewer && (
        <StoriesViewer
          groupId={groupId}
          stories={stories}
          onClose={() => setShowViewer(false)}
        />
      )}
    </>
  );
}

interface StoriesViewerProps {
  groupId: string;
  stories: Story[];
  onClose: () => void;
  initialStoryIndex?: number;
}

// Full-screen stories viewer
export function StoriesViewer({
  stories,
  onClose,
  initialStoryIndex = 0,
}: StoriesViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex];
  const STORY_DURATION = 5000; // 5 seconds per story

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  // Auto-advance timer
  useEffect(() => {
    if (isPaused) return;

    const startTime = Date.now();
    const duration = currentStory?.mediaType === "VIDEO" ? 30000 : STORY_DURATION;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        goToNext();
      } else {
        timerRef.current = setTimeout(updateProgress, 50);
      }
    };

    timerRef.current = setTimeout(updateProgress, 50);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, isPaused, currentStory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  if (!currentStory) return null;

  const timeAgo = formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true });

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {stories.map((_, index) => (
          <div
            key={index}
            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width:
                  index < currentIndex
                    ? "100%"
                    : index === currentIndex
                    ? `${progress}%`
                    : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700">
            {currentStory.uploader.avatarUrl ? (
              <img
                src={currentStory.uploader.avatarUrl}
                alt={currentStory.uploader.name || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                {currentStory.uploader.name?.charAt(0) || "?"}
              </div>
            )}
          </div>
          <div>
            <p className="text-white font-medium text-sm">
              {currentStory.uploader.name}
            </p>
            <p className="text-white/60 text-xs">{timeAgo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused((p) => !p)}
            className="p-2 text-white/80 hover:text-white"
          >
            {isPaused ? (
              <Play className="h-5 w-5" />
            ) : (
              <Pause className="h-5 w-5" />
            )}
          </button>
          {(currentStory.mediaType === "VIDEO" ||
            currentStory.mediaType === "AUDIO") && (
            <button
              onClick={() => setIsMuted((m) => !m)}
              className="p-2 text-white/80 hover:text-white"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Navigation areas */}
      <button
        onClick={goToPrev}
        className="absolute left-0 top-1/4 bottom-1/4 w-1/3 z-10"
        aria-label="Previous story"
      />
      <button
        onClick={goToNext}
        className="absolute right-0 top-1/4 bottom-1/4 w-1/3 z-10"
        aria-label="Next story"
      />

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          onClick={goToPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white/80 hover:text-white z-20"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white/80 hover:text-white z-20"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Story content */}
      <div className="relative w-full max-w-lg h-full max-h-[80vh] flex items-center justify-center">
        {currentStory.mediaType === "IMAGE" && currentStory.mediaUrl && (
          <img
            src={currentStory.mediaUrl}
            alt={currentStory.caption || "Story"}
            className="max-w-full max-h-full object-contain rounded-2xl"
          />
        )}

        {currentStory.mediaType === "VIDEO" && currentStory.mediaUrl && (
          <video
            ref={videoRef}
            src={currentStory.mediaUrl}
            className="max-w-full max-h-full object-contain rounded-2xl"
            autoPlay
            loop
            muted={isMuted}
            playsInline
          />
        )}

        {currentStory.mediaType === "AUDIO" && currentStory.mediaUrl && (
          <AudioPlayer
            src={currentStory.mediaUrl}
            caption={currentStory.caption || "Voice Story"}
            autoPlay={!isMuted}
            className="w-full max-w-sm"
          />
        )}

        {currentStory.mediaType === "TEXT" && (
          <div className="w-full max-w-sm p-8 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center min-h-[300px]">
            <p className="text-white text-xl font-medium text-center leading-relaxed">
              {currentStory.textContent}
            </p>
          </div>
        )}

        {currentStory.mediaType === "LINK" && currentStory.mediaUrl && (
          <div className="w-full max-w-sm p-8 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-600 flex flex-col items-center gap-4">
            <p className="text-white/80 text-sm">Shared Link</p>
            <p className="text-white text-center break-all">
              {currentStory.mediaUrl}
            </p>
          </div>
        )}
      </div>

      {/* Caption and rules */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        {currentStory.caption && (
          <p className="text-white text-center mb-3">{currentStory.caption}</p>
        )}
        {currentStory.ruleLinks.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {currentStory.ruleLinks.map(({ rule }) => (
              <span
                key={rule.id}
                className="px-3 py-1 rounded-full bg-white/20 text-white text-xs"
              >
                {rule.description}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
