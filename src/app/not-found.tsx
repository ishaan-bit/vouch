import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--dusk-1)] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6">
        {/* 404 Display */}
        <div className="relative">
          <div className="text-8xl font-bold bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)] bg-clip-text text-transparent">
            404
          </div>
          <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-[var(--accent-violet)]/20 to-[var(--accent-magenta)]/20 -z-10" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-white">Page Not Found</h1>
          <p className="text-white/50 text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link href="/home">
            <Button className="w-full bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)] hover:opacity-90 min-h-[48px] touch-action-manipulation">
              <Home className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
          </Link>
          <Link href="/discover">
            <Button
              variant="ghost"
              className="w-full text-white/60 hover:text-white hover:bg-white/10 min-h-[48px] touch-action-manipulation"
            >
              <Search className="h-4 w-4 mr-2" />
              Discover Pacts
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
