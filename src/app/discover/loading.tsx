export default function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-[var(--dusk-1)] flex flex-col items-center justify-center p-4 pb-28">
      {/* Header skeleton */}
      <div className="absolute top-6 left-4 right-4 z-10">
        <div className="animate-pulse space-y-2">
          <div className="h-8 w-32 bg-white/10 rounded-lg" />
          <div className="h-4 w-48 bg-white/10 rounded-lg" />
        </div>
      </div>

      {/* Card skeleton */}
      <div className="animate-pulse w-full max-w-sm aspect-[3/4] bg-[var(--dusk-2)]/60 rounded-3xl border border-white/[0.06]" />

      {/* Actions skeleton */}
      <div className="flex items-center justify-center gap-6 mt-8">
        <div className="animate-pulse h-14 w-14 rounded-full bg-white/10" />
        <div className="animate-pulse h-16 w-16 rounded-full bg-white/10" />
        <div className="animate-pulse h-14 w-14 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
