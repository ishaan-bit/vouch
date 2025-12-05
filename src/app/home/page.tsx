import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout";
import { HomeContent } from "@/components/home/home-content";

export default async function HomePage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/");
  }

  return (
    <AppShell>
      <HomeContent userId={session.user.id} />
    </AppShell>
  );
}
