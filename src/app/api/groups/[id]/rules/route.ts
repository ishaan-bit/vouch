import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/groups/[id]/rules - Create a rule (group-wide, for everyone)
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const body = await request.json();
    const { title, description, stakeAmount } = body;

    // Validate required fields
    if (!title || !description || !stakeAmount) {
      return NextResponse.json(
        { error: "title, description, and stakeAmount are required" },
        { status: 400 }
      );
    }

    // Validate stake amount (1-10000 rupees in paise)
    const stake = parseInt(stakeAmount);
    if (isNaN(stake) || stake < 100 || stake > 1000000) {
      return NextResponse.json(
        { error: "Stake must be between ₹1 and ₹10,000" },
        { status: 400 }
      );
    }

    // Check user is a member
    const membership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    // Check if user already has a rule in this group
    const existingRule = await prisma.rule.findFirst({
      where: {
        groupId,
        creatorId: session.user.id,
      },
    });

    if (existingRule) {
      return NextResponse.json(
        { error: "You already have a rule in this group. Each member can only contribute one rule." },
        { status: 400 }
      );
    }

    // Check group is in planning status
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          select: { userId: true },
        },
      },
    });

    if (group?.status !== "PLANNING") {
      return NextResponse.json(
        { error: "Group is not in planning phase" },
        { status: 400 }
      );
    }

    // Create rule - now group-wide, no targetUserId
    const rule = await prisma.rule.create({
      data: {
        groupId,
        creatorId: session.user.id,
        title,
        description,
        stakeAmount: stake,
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
    });

    // Notify other members about the new rule
    const otherMembers = group.memberships.filter(m => m.userId !== session.user.id);
    if (otherMembers.length > 0) {
      try {
        await prisma.notification.createMany({
          data: otherMembers.map(m => ({
            userId: m.userId,
            type: "RULE_ADDED",
            title: "New rule added",
            message: `${session.user.name || "A member"} added a rule "${title}" to "${group.name}". Review and approve it!`,
            data: JSON.stringify({
              groupId,
              groupName: group.name,
              ruleId: rule.id,
              ruleTitle: title,
              creatorName: session.user.name,
            }),
          })),
        });
      } catch (notifError) {
        console.error("[RULES] Failed to create notifications:", notifError);
      }
    }

    // Increment rulesCreatedCount for the user
    await prisma.profileStats.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, rulesCreatedCount: 1 },
      update: { rulesCreatedCount: { increment: 1 } },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("Error creating rule:", error);
    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    );
  }
}

// GET /api/groups/[id]/rules - List rules in a group
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    // Check user is a member
    const membership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    const rules = await prisma.rule.findMany({
      where: { groupId },
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
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Error fetching rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    );
  }
}
