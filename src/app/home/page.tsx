import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { AppShell } from "@/components/layout";
import { HomeContent } from "@/components/home/home-content";

export default async function HomePage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/");
  }

  // Check if user has accepted Vouch Club rules
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hasAcceptedVouchRules: true },
    });

    if (user && !user.hasAcceptedVouchRules) {
      redirect("/rules?first=true");
    }
  } catch (error) {
    // If column doesn't exist yet, skip the check
    console.error("Error checking rules acceptance:", error);
  }

  return (
    <AppShell>
      <HomeContent userId={session.user.id} />
    </AppShell>
  );
}
