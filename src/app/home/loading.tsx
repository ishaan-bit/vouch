import { PactCardSkeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
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

        {/* Upcoming calls skeleton */}
        <div className="animate-pulse">
          <div className="h-5 w-24 bg-white/10 rounded mb-3" />
          <div className="h-20 w-full bg-[var(--dusk-2)]/60 rounded-2xl border border-white/[0.06]" />
        </div>

        {/* Active pacts skeleton */}
        <div className="space-y-4">
          <div className="animate-pulse h-5 w-32 bg-white/10 rounded" />
          {[...Array(3)].map((_, i) => (
            <PactCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
