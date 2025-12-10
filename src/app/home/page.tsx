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
  let hasAcceptedRules = true; // Default to true if check fails
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hasAcceptedVouchRules: true },
    });

    if (user) {
      hasAcceptedRules = user.hasAcceptedVouchRules ?? false;
    }
  } catch (error) {
    // If column doesn't exist yet, skip the check
    console.error("Error checking rules acceptance:", error);
  }

  // Redirect OUTSIDE of try-catch (Next.js redirect throws internally)
  if (!hasAcceptedRules) {
    redirect("/rules?first=true");
  }

  return (
    <AppShell>
      <HomeContent userId={session.user.id} />
    </AppShell>
  );
}
