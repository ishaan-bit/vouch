import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/groups/[id]/start - Start the challenge
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    console.log(`[START] User ${session.user.id} attempting to start group ${groupId}`);

    // Get group with memberships and rules (including approvals)
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        rules: {
          include: {
            approvals: true,
            creator: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!group) {
      console.log(`[START] Group ${groupId} not found`);
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Only creator can start the challenge
    if (group.createdByUserId !== session.user.id) {
      console.log(`[START] User ${session.user.id} is not the creator of group ${groupId}`);
      return NextResponse.json(
        { error: "Only the group creator can start the challenge" },
        { status: 403 }
      );
    }

    // Must be in planning phase
    if (group.status !== "PLANNING") {
      console.log(`[START] Group ${groupId} status is ${group.status}, not PLANNING`);
      return NextResponse.json(
        { error: "Challenge has already started or completed" },
        { status: 400 }
      );
    }

    // Need at least 2 members
    if (group.memberships.length < 2) {
      console.log(`[START] Group ${groupId} has only ${group.memberships.length} members`);
      return NextResponse.json(
        { error: "Need at least 2 members to start the challenge" },
        { status: 400 }
      );
    }

    // Every member must have contributed a rule
    const memberIds = group.memberships.map((m) => m.userId);
    const ruleCreatorIds = group.rules.map((r) => r.creatorId);
    const membersWithoutRules = memberIds.filter((id: string) => !ruleCreatorIds.includes(id));

    if (membersWithoutRules.length > 0) {
      const missingMembers = group.memberships
        .filter((m) => membersWithoutRules.includes(m.userId))
        .map((m) => m.user.name || "Unknown")
        .join(", ");
      console.log(`[START] Members without rules: ${missingMembers}`);
      return NextResponse.json(
        { error: `These members must add their rule: ${missingMembers}` },
        { status: 400 }
      );
    }

    // Check if all rules are approved
    const approvalsNeeded = group.memberships.length - 1; // All members except rule creator must approve
    const unapprovedRules = group.rules.filter((rule) => {
      // A rule is approved if it has the approved flag OR has enough approvals
      return !rule.approved && rule.approvals.length < approvalsNeeded;
    });

    if (unapprovedRules.length > 0) {
      const unapprovedList = unapprovedRules
        .map((r) => `"${r.title}" by ${r.creator.name}`)
        .join(", ");
      console.log(`[START] Unapproved rules: ${unapprovedList}`);
      return NextResponse.json(
        { error: `These rules need approval from all members: ${unapprovedList}` },
        { status: 400 }
      );
    }

    // Calculate dates using group's durationDays
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + group.durationDays);

    // Schedule end-of-cycle call at 9 PM on the last day
    const scheduledCallTime = new Date(endDate);
    scheduledCallTime.setHours(21, 0, 0, 0);

    console.log(`[START] Starting group ${groupId} from ${startDate} to ${endDate}`);

    // Use transaction to update group and create call session
    const [updatedGroup, callSession] = await prisma.$transaction([
      // Update group status
      prisma.group.update({
        where: { id: groupId },
        data: {
          status: "ACTIVE",
          startDate,
          endDate,
        },
      }),
      // Create scheduled call session
      prisma.callSession.create({
        data: {
          groupId,
          scheduledAt: scheduledCallTime,
          status: "SCHEDULED",
        },
      }),
    ]);

    // Increment groupsStarted for all members
    await Promise.all(
      group.memberships.map((m) =>
        prisma.profileStats.upsert({
          where: { userId: m.userId },
          create: { userId: m.userId, groupsStarted: 1 },
          update: { groupsStarted: { increment: 1 } },
        })
      )
    );

    // Notify all members that challenge has started
    await prisma.notification.createMany({
      data: group.memberships
        .filter((m) => m.userId !== session.user.id)
        .map((m) => ({
          userId: m.userId,
          type: "GROUP_STARTED" as const,
          title: "Challenge Started! 🚀",
          message: `${group.name} has begun! Good luck!`,
          data: { groupId: group.id, groupName: group.name },
        })),
    });

    console.log(`[START] Group ${groupId} started successfully`);

    return NextResponse.json({
      message: "Challenge started!",
      group: updatedGroup,
      callSession,
    });
  } catch (error) {
    console.error("[START] Error starting challenge:", error);
    return NextResponse.json(
      { error: "Failed to start challenge. Please try again." },
      { status: 500 }
    );
  }
}
