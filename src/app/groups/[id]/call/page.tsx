"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ReviewCall } from "@/components/groups";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

interface GroupCallPageProps {
  params: Promise<{ id: string }>;
}

export default function GroupCallPage({ params }: GroupCallPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const { data: group, isLoading } = useQuery({
    queryKey: ["group", id],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${id}`);
      if (!res.ok) throw new Error("Failed to fetch group");
      return res.json();
    },
  });

  if (isLoading || !session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="flex items-center gap-4 p-4 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-white">Review Call</h1>
            <p className="text-sm text-slate-400">{group?.name}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto">
        <ReviewCall 
          groupId={id} 
          groupName={group?.name || "Group"} 
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
