import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout";
import { MessagesContent } from "@/components/messages/messages-content";

export default async function MessagesPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <AppShell>
      <MessagesContent userId={session.user.id} />
    </AppShell>
  );
}
