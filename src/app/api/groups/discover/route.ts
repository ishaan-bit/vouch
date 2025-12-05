import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * GET /api/groups/discover - Get discoverable pacts that the user can join
 * 
 * Returns groups where:
 * - visibility = PUBLIC
 * - isOpenToJoin = true
 * - status = PLANNING (pacts not started yet)
 * - current user is NOT already a member
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Find all PUBLIC, open-to-join groups in PLANNING status
    // where the current user is NOT a member
    const groups = await prisma.group.findMany({
      where: {
        visibility: "PUBLIC",
        isOpenToJoin: true,
        status: "PLANNING",
        // Exclude groups where user is already a member
        NOT: {
          memberships: {
            some: {
              userId: userId,
            },
          },
        },
      },
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
                avatarUrl: true,
              },
            },
          },
        },
        rules: {
          where: {
            approved: true,
          },
          select: {
            id: true,
            title: true,
            stakeAmount: true,
            creator: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            memberships: true,
            rules: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data to include stakes summary
    const transformedGroups = groups.map((group: typeof groups[number]) => {
      const approvedRules = group.rules;
      const stakeAmounts = approvedRules.map((r: { stakeAmount: number }) => r.stakeAmount);
      
      return {
        id: group.id,
        name: group.name,
        slug: group.slug,
        description: group.description,
        durationDays: group.durationDays,
        status: group.status,
        createdAt: group.createdAt,
        creator: group.creator,
        members: group.memberships.map((m: { user: unknown }) => m.user),
        memberCount: group._count.memberships,
        rules: group.rules,
        rulesCount: group._count.rules,
        stakes: {
          minStakeAmount: stakeAmounts.length > 0 ? Math.min(...stakeAmounts) : null,
          maxStakeAmount: stakeAmounts.length > 0 ? Math.max(...stakeAmounts) : null,
        },
      };
    });

    return NextResponse.json(transformedGroups);
  } catch (error) {
    console.error("Error fetching discoverable groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch discoverable groups" },
      { status: 500 }
    );
  }
}
