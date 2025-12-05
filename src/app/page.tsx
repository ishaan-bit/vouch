"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PactHeroVisual, FeatureCard, DustParticles, VouchLogo } from "@/components/vouch";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session) {
      router.push("/home");
    }
  }, [session, router]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn("google", { callbackUrl: "/home" });
    } catch {
      setIsSigningIn(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0618] flex items-center justify-center">
        <VouchLogo size="lg" animate={true} />
      </div>
    );
  }

  if (session) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Deep dusk gradient background */}
      <div
        className="fixed inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(76, 29, 149, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 40%),
            radial-gradient(ellipse at 20% 80%, rgba(217, 70, 239, 0.15) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 100%, rgba(88, 28, 135, 0.3) 0%, transparent 50%),
            linear-gradient(to bottom, #0a0618 0%, #1a0a2e 40%, #0f0720 100%)
          `,
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette effect */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, transparent 0%, rgba(10, 6, 24, 0.5) 100%)`,
        }}
      />

      {/* Dust particles */}
      <DustParticles />

      {/* Main content */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Hero Section */}
        <div
          className={`flex flex-col items-center transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Title with glow */}
          <div className="relative mb-4">
            <h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight text-center"
              style={{
                textShadow: `
                  0 0 40px rgba(168, 85, 247, 0.5),
                  0 0 80px rgba(139, 92, 246, 0.3),
                  0 2px 4px rgba(0, 0, 0, 0.5)
                `,
              }}
            >
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
                Vouch
              </span>
            </h1>
            {/* Glow behind title */}
            <div className="absolute -inset-4 bg-violet-500/10 blur-3xl -z-10 rounded-full" />
          </div>

          {/* Tagline */}
          <p
            className={`text-xs md:text-sm text-violet-300/70 text-center tracking-[0.3em] uppercase font-medium mb-8 transition-all duration-1000 delay-200 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{
              textShadow: "0 0 20px rgba(168, 85, 247, 0.3)",
            }}
          >
            Strength through Unity · Unity through Faith
          </p>
        </div>

        {/* Hero Visual - Pact Table */}
        <div
          className={`relative mb-10 transition-all duration-1000 delay-300 ${
            mounted ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
        >
          <PactHeroVisual />
        </div>

        {/* CTA Section */}
        <div
          className={`flex flex-col items-center gap-4 transition-all duration-1000 delay-500 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Sign In Button - Game Start Style */}
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="group relative px-10 py-4 rounded-full font-semibold text-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)`,
              boxShadow: `
                0 4px 25px rgba(139, 92, 246, 0.5),
                0 0 50px rgba(168, 85, 247, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.2)
              `,
            }}
          >
            {/* Button shimmer on hover */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 group-hover:animate-shimmer" />

            {/* Button content */}
            <span className="relative flex items-center gap-3 text-white">
              {isSigningIn ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Begin the Pact
                </>
              )}
            </span>

            {/* Pulse ring */}
            <div
              className="absolute inset-0 rounded-full border-2 border-violet-400/40"
              style={{ animation: "pulse-ring 2s ease-out infinite" }}
            />
          </button>

          {/* Sub-CTA text */}
          <p className="text-sm text-violet-300/60 text-center">
            Set your pact length when you begin.
          </p>
        </div>

        {/* Features Section */}
        <div
          className={`w-full max-w-2xl mt-16 md:mt-20 px-4 transition-all duration-1000 delay-700 ${
            mounted ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="grid gap-4">
            <FeatureCard
              icon={
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
                  <path d="M12 8v4l2 2" />
                </svg>
              }
              title="Make tiny social contracts"
              description="Create personal rules and stake real money. Your friends hold you accountable."
              delay={800}
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 8h.01M12 3a9 9 0 1 0 9 9 4 4 0 0 1-4-4 4 4 0 0 0-4-4" />
                  <circle cx="15" cy="8" r="3" />
                </svg>
              }
              title="Upload proofs instead of excuses"
              description="Share photos, screenshots, or videos as evidence. Everyone sees the feed."
              delay={1000}
            />
            <FeatureCard
              icon={
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
              title="End-of-cycle call to vouch and vote"
              description="Hop on a call, review proofs together, and vote on who followed through."
              delay={1200}
            />
          </div>
        </div>

        {/* Footer flourish */}
        <div
          className={`mt-16 md:mt-20 text-center transition-all duration-1000 delay-1000 ${
            mounted ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <VouchLogo size="sm" animate={false} />
          </div>
          <p className="text-xs text-violet-400/40 tracking-widest uppercase">
            Keep your word
          </p>
          <p className="mt-8 text-[10px] text-white/20 tracking-wide">
            A QuietDen Experience
          </p>
        </div>
      </main>

    </div>
  );
}
