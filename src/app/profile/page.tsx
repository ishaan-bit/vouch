import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout";
import { ProfileContent } from "@/components/profile/profile-content";
import prisma from "@/lib/db";

export default async function ProfilePage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profileStats: true,
      proofs: {
        where: { isPublic: true },
        include: {
          group: {
            select: { id: true, name: true },
          },
          ruleLinks: {
            include: {
              rule: { select: { description: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      createdRules: {
        include: {
          group: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      groupMemberships: {
        include: {
          group: {
            include: {
              _count: { select: { memberships: true, rules: true } },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
      friendRequestsSent: {
        where: { status: "ACCEPTED" },
        include: {
          receiver: {
            select: { id: true, name: true, username: true, avatarUrl: true },
          },
        },
      },
      friendRequestsReceived: {
        where: { status: "ACCEPTED" },
        include: {
          requester: {
            select: { id: true, name: true, username: true, avatarUrl: true },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  // Combine friends from both directions
  const friends = [
    ...user.friendRequestsSent.map((f: { receiver: any }) => f.receiver),
    ...user.friendRequestsReceived.map((f: { requester: any }) => f.requester),
  ];

  return (
    <AppShell>
      <ProfileContent 
        user={user} 
        friends={friends}
        isOwnProfile={true}
      />
    </AppShell>
  );
}
