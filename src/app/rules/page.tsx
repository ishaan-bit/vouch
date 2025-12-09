"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { VouchRulesScreen } from "@/components/rules";
import { Loader2 } from "lucide-react";

function RulesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstTime = searchParams?.get("first") === "true";

  const handleClose = () => {
    router.back();
  };

  return (
    <VouchRulesScreen 
      isFirstTime={isFirstTime} 
      onClose={handleClose}
    />
  );
}

export default function RulesPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    }>
      <RulesContent />
    </Suspense>
  );
}
