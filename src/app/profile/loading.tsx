import { ProfileSkeleton, PactCardSkeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[var(--dusk-1)]">
      <div className="px-4 py-6 space-y-6 pb-28">
        <ProfileSkeleton />
        
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse h-20 bg-[var(--dusk-2)]/60 rounded-2xl border border-white/[0.06]" />
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="animate-pulse h-12 w-full bg-[var(--dusk-2)]/60 rounded-2xl" />

        {/* Content skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <PactCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
