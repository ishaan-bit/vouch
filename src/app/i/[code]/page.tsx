import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

/**
 * Invite Link Route: /i/[code]
 * 
 * This route handles pact invite links. When someone shares a pact invite code,
 * they can create a link like: https://vouch.app/i/abc123
 * 
 * Flow:
 * 1. If user is not logged in → redirect to signin with callback to this page
 * 2. If code is invalid → show 404
 * 3. If user is already a member → redirect to pact page
 * 4. If pact is not in PLANNING → redirect with error
 * 5. Otherwise → redirect to pact page where they can join
 */
export default async function InvitePage({ params }: InvitePageProps) {
  const session = await auth();
  const { code } = await params;

  // If not logged in, redirect to signin with callback
  if (!session?.user) {
    const callbackUrl = encodeURIComponent(`/i/${code}`);
    redirect(`/auth/signin?callbackUrl=${callbackUrl}&invite=${code}`);
  }

  // Find the pact by invite code
  const group = await prisma.group.findUnique({
    where: { inviteCode: code },
    select: {
      id: true,
      name: true,
      status: true,
      memberships: {
        where: { userId: session.user.id },
        select: { id: true },
      },
      creator: {
        select: { name: true },
      },
    },
  });

  if (!group) {
    notFound();
  }

  // If already a member, go straight to pact
  if (group.memberships.length > 0) {
    redirect(`/groups/${group.id}`);
  }

  // If pact is not in planning phase, can't join
  if (group.status !== "PLANNING") {
    redirect(`/groups/${group.id}?error=closed`);
  }

  // Redirect to the pact page where they can see details and join
  redirect(`/groups/${group.id}?from=invite&inviter=${encodeURIComponent(group.creator.name || 'A friend')}`);
}
