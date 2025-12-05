"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--dusk-1)] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6">
        {/* Error icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>

        {/* Error message */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
          <p className="text-white/50 text-sm">
            We encountered an unexpected error. Please try again.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={reset}
            className="w-full bg-gradient-to-r from-[var(--accent-violet)] to-[var(--accent-magenta)] hover:opacity-90 min-h-[48px] touch-action-manipulation"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.location.href = "/home"}
            className="w-full text-white/60 hover:text-white hover:bg-white/10 min-h-[48px] touch-action-manipulation"
          >
            Go to Home
          </Button>
        </div>

        {/* Error details (only in development) */}
        {process.env.NODE_ENV === "development" && (
          <details className="text-left">
            <summary className="text-xs text-white/30 cursor-pointer hover:text-white/50">
              Technical Details
            </summary>
            <pre className="mt-2 p-3 rounded-xl bg-[var(--dusk-2)] text-xs text-white/50 overflow-auto max-h-40">
              {error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
