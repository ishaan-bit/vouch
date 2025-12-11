"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  caption?: string | null;
  className?: string;
  compact?: boolean;
  autoPlay?: boolean;
  showWaveform?: boolean;
}

export function AudioPlayer({ 
  src, 
  caption, 
  className, 
  compact = false,
  autoPlay = false,
  showWaveform = true,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    if (autoPlay && isLoaded && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Autoplay was prevented, that's ok
      });
    }
  }, [autoPlay, isLoaded]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Generate fake waveform bars (for visual appeal)
  const waveformBars = Array.from({ length: 30 }, (_, i) => {
    const height = Math.sin(i * 0.5) * 30 + Math.random() * 20 + 20;
    const isActive = duration > 0 && (i / 30) < (currentTime / duration);
    return { height, isActive };
  });

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-full bg-violet-500/20 border border-violet-500/30",
        className
      )}>
        <audio ref={audioRef} src={src} preload="metadata" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-violet-500 hover:bg-violet-600 text-white"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </Button>
        <div className="flex-1 flex items-center gap-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground min-w-[35px]">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-4 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white",
      className
    )}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Icon and title */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className={cn(
          "w-12 h-12 rounded-full bg-white/20 flex items-center justify-center",
          isPlaying && "animate-pulse"
        )}>
          <Mic className="h-6 w-6 text-white" />
        </div>
        {caption && (
          <span className="text-sm text-white/80">{caption}</span>
        )}
      </div>

      {/* Waveform visualization */}
      {showWaveform && (
        <div className="flex items-end justify-center gap-0.5 h-12 mb-4">
          {waveformBars.map((bar, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-colors",
                bar.isActive ? "bg-white" : "bg-white/30"
              )}
              style={{ height: `${bar.height}%` }}
            />
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-white text-violet-600 hover:bg-white/90 hover:text-violet-700"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        <div className="flex-1">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="[&_[role=slider]]:bg-white [&_.bg-primary]:bg-white"
          />
        </div>

        <span className="text-sm text-white/80 min-w-[45px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-white hover:bg-white/20"
          onClick={toggleMute}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
