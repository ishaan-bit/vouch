import { MessageSkeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return (
    <div className="min-h-screen bg-[var(--dusk-1)]">
      <div className="px-4 py-6 space-y-6 pb-28">
        {/* Header skeleton */}
        <div className="relative pt-6">
          <div className="animate-pulse space-y-2">
            <div className="h-8 w-32 bg-white/10 rounded-lg" />
            <div className="h-4 w-48 bg-white/10 rounded-lg" />
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="animate-pulse h-12 w-full bg-[var(--dusk-2)]/60 rounded-2xl" />

        {/* Messages list skeleton */}
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <MessageSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
