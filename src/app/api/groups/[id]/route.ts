import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/groups/[id] - Get group details
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const group = await prisma.group.findUnique({
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
            _count: {
              select: {
                proofLinks: true,
              },
            },
          },
        },
        proofs: {
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            ruleLinks: {
              include: {
                rule: true,
              },
            },
            reactions: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        callSessions: {
          orderBy: {
            scheduledAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if user is a member
    const isMember = group.memberships.some((m: { userId: string }) => m.userId === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json(
      { error: "Failed to fetch group" },
      { status: 500 }
    );
  }
}

// PATCH /api/groups/[id] - Update group (e.g., start the group)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        memberships: true,
        rules: {
          include: {
            approvals: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if user is creator
    if (group.createdByUserId !== session.user.id) {
      return NextResponse.json({ error: "Only creator can update group" }, { status: 403 });
    }

    // Handle start group action
    if (body.action === "start") {
      // Check if all members are ready
      const allReady = group.memberships.every((m: { isReady: boolean }) => m.isReady);
      if (!allReady) {
        return NextResponse.json(
          { error: "Not all members are ready" },
          { status: 400 }
        );
      }

      // Check if there are approved rules
      const approvedRules = group.rules.filter((r: { approved: boolean }) => r.approved);
      if (approvedRules.length === 0) {
        return NextResponse.json(
          { error: "No approved rules to start" },
          { status: 400 }
        );
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + group.durationDays);

      const updatedGroup = await prisma.group.update({
        where: { id },
        data: {
          status: "ACTIVE",
          startDate,
          endDate,
        },
      });

      // Create scheduled call session for end of cycle
      await prisma.callSession.create({
        data: {
          groupId: id,
          scheduledAt: endDate,
        },
      });

      return NextResponse.json(updatedGroup);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json(
      { error: "Failed to update group" },
      { status: 500 }
    );
  }
}
