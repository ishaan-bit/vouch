import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout";
import { DiscoverContent } from "@/components/discover/discover-content";

export default async function DiscoverPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <AppShell>
      <DiscoverContent userId={session.user.id} />
    </AppShell>
  );
}
