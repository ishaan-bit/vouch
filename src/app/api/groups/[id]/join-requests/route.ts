import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// Type for Prisma transaction client
type PrismaTransactionClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * GET /api/groups/[id]/join-requests - Get pending join requests for a group (creator only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify user is the group creator
    const group = await prisma.group.findUnique({
      where: { id },
      select: { createdByUserId: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.createdByUserId !== session.user.id) {
      return NextResponse.json({ error: "Only the creator can view join requests" }, { status: 403 });
    }

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
            username: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(joinRequests);
  } catch (error) {
    console.error("Error fetching join requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch join requests" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/[id]/join-requests - Submit a join request with a rule
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, stakeAmount } = body;

    // Validate input
    if (!title || !description || !stakeAmount) {
      return NextResponse.json(
        { error: "Title, description, and stake amount are required" },
        { status: 400 }
      );
    }

    // Fetch the group
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        memberships: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if group is joinable
    if (group.visibility !== "PUBLIC" || !group.isOpenToJoin) {
      return NextResponse.json(
        { error: "This group is not open to join" },
        { status: 403 }
      );
    }

    if (group.status !== "PLANNING") {
      return NextResponse.json(
        { error: "Cannot join a group that has already started" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const isMember = group.memberships.some((m: { userId: string }) => m.userId === session.user.id);
    if (isMember) {
      return NextResponse.json(
        { error: "You are already a member of this group" },
        { status: 400 }
      );
    }

    // Check if user already has a pending request
    const existingRequest = await prisma.joinRequest.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId: session.user.id,
        },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending request for this group" },
        { status: 400 }
      );
    }

    // Create the rule and join request in a transaction
    const result = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // Create the rule (not approved yet)
      const rule = await tx.rule.create({
        data: {
          groupId: id,
          creatorId: session.user.id,
          title,
          description,
          stakeAmount: Math.round(stakeAmount * 100), // Convert to paise
          approved: false,
        },
      });

      // Create the join request
      const joinRequest = await tx.joinRequest.create({
        data: {
          groupId: id,
          userId: session.user.id,
          ruleId: rule.id,
          status: "PENDING",
        },
      });

      // Notify the group creator
      await tx.notification.create({
        data: {
          userId: group.createdByUserId,
          type: "JOIN_REQUEST",
          title: "New join request",
          message: `${session.user.name || "Someone"} wants to join "${group.name}" with a new rule`,
          data: {
            groupId: id,
            groupName: group.name,
            joinRequestId: joinRequest.id,
            userId: session.user.id,
            userName: session.user.name,
            ruleTitle: title,
            stakeAmount: stakeAmount,
          },
        },
      });

      return { rule, joinRequest };
    });

    return NextResponse.json({
      message: "Join request submitted successfully",
      joinRequest: result.joinRequest,
      rule: result.rule,
    });
  } catch (error) {
    console.error("Error creating join request:", error);
    return NextResponse.json(
      { error: "Failed to submit join request" },
      { status: 500 }
    );
  }
}
