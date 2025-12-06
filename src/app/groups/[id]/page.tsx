import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { AppShell } from "@/components/layout";
import { GroupDetailContent } from "@/components/groups";
import { GroupNonMemberView } from "@/components/groups/group-non-member-view";

interface GroupPageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupPage({ params }: GroupPageProps) {
  console.log("[GroupPage] Starting...");
  
  const session = await auth();
  console.log("[GroupPage] Session:", session?.user?.id ? "authenticated" : "no session");
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const { id } = await params;
  console.log("[GroupPage] Group ID:", id);

  // First, just check if the group exists
  let groupExists;
  try {
    groupExists = await prisma.group.findUnique({
      where: { id },
      select: { id: true },
    });
    console.log("[GroupPage] Group exists:", !!groupExists);
  } catch (error) {
    console.error("[GroupPage] Error checking group existence:", error);
    throw error;
  }

  if (!groupExists) {
    notFound();
  }

  // Now fetch the full group data
  console.log("[GroupPage] Fetching full group data...");
  let group;
  try {
    group = await prisma.group.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
                upiId: true,
              },
            },
          },
        },
        rules: {
          where: {
            approved: true,
          },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            approvals: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        joinRequests: {
          where: {
            userId: session.user.id,
          },
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: {
            proofs: true,
          },
        },
      },
    });
    console.log("[GroupPage] Full group data fetched:", !!group);
  } catch (error) {
    console.error("[GroupPage] Error fetching full group:", error);
    throw error;
  }

  if (!group) {
    notFound();
  }

  // Check if user is a member
  const isMember = group.memberships.some((m: { userId: string }) => m.userId === session.user.id);
  
  // If member, show full detail view
  if (isMember) {
    // Check if user is the creator
    const isCreator = group.createdByUserId === session.user.id;
    
    // Refetch with all rules (including unapproved) for members
    const fullGroup = await prisma.group.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
                upiId: true,
              },
            },
          },
        },
        rules: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            approvals: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            proofs: true,
          },
        },
      },
    });

    if (!fullGroup) {
      notFound();
    }

    // Fetch join requests separately for creator
    let pendingJoinRequests: Array<{
      id: string;
      user: { id: string; name: string | null; avatarUrl: string | null };
      rule: { id: string; title: string; description: string; stakeAmount: number };
    }> = [];

    if (isCreator) {
      const joinRequests = await prisma.joinRequest.findMany({
        where: {
          groupId: id,
          status: "PENDING",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          rule: {
            select: {
              id: true,
              title: true,
              description: true,
              stakeAmount: true,
            },
          },
        },
      });
      pendingJoinRequests = joinRequests;
    }

    return (
      <AppShell>
        <GroupDetailContent 
          group={fullGroup} 
          currentUserId={session.user.id}
          pendingJoinRequests={pendingJoinRequests}
        />
      </AppShell>
    );
  }

  // Check if group allows joining
  const canJoin = group.status === "PLANNING" && 
    (group as { isOpenToJoin?: boolean }).isOpenToJoin !== false;

  // Check if user already has a pending request
  const existingRequest = group.joinRequests[0];

  return (
    <AppShell>
      <GroupNonMemberView 
        group={{
          id: group.id,
          name: group.name,
          description: group.description,
          status: group.status,
          durationDays: group.durationDays,
          startDate: group.startDate,
          creator: group.creator,
          memberCount: group.memberships.length,
          rules: group.rules.map((r: {
            id: string;
            title: string;
            description: string;
            stakeAmount: number;
            creator: { name: string | null };
          }) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            stakeAmount: r.stakeAmount,
            creatorName: r.creator.name,
          })),
        }} 
        currentUserId={session.user.id}
        canJoin={canJoin}
        existingRequest={existingRequest}
      />
    </AppShell>
  );
}
