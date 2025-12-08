"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PactHeroVisual, FeatureCard, DustParticles, VouchLogo } from "@/components/vouch";
import { IntroSplashWrapper } from "@/components/intro/intro-splash";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session) {
      router.push("/home");
    }
  }, [session, router]);

  /**
   * Handle "Begin the Pact" click
   * 
   * OLD BEHAVIOR: Directly triggered Google OAuth via signIn("google", { callbackUrl: "/home" })
   * NEW BEHAVIOR: Navigate to /auth/signin to let users choose between Google or Email auth
   * 
   * If user is already authenticated, go straight to /home
   */
  const handleBeginPact = () => {
    if (session) {
      // Already logged in - go to home/dashboard
      router.push("/home");
    } else {
      // Not logged in - go to sign in page with callback to /home
      router.push("/auth/signin?callbackUrl=/home");
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
    <IntroSplashWrapper>
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
            onClick={handleBeginPact}
            className="group relative px-10 py-4 rounded-full font-semibold text-lg transition-all duration-300 hover:scale-105 active:scale-95"
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
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Begin the Pact
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
    </IntroSplashWrapper>
  );
}
