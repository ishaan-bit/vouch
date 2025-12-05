import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout";
import { ActivityContent } from "@/components/activity/activity-content";

export default async function ActivityPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <AppShell>
      <ActivityContent userId={session.user.id} />
    </AppShell>
  );
}
