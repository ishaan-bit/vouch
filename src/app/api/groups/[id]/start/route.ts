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

    // Get group with memberships and rules
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: true,
        rules: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Only creator can start the challenge
    if (group.createdByUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the group creator can start the challenge" },
        { status: 403 }
      );
    }

    // Must be in planning phase
    if (group.status !== "PLANNING") {
      return NextResponse.json(
        { error: "Challenge has already started or completed" },
        { status: 400 }
      );
    }

    // Need at least 2 members
    if (group.memberships.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 members to start the challenge" },
        { status: 400 }
      );
    }

    // Every member must have contributed a rule
    const memberIds = group.memberships.map((m: { userId: string }) => m.userId);
    const ruleCreatorIds = group.rules.map((r: { creatorId: string }) => r.creatorId);
    const membersWithoutRules = memberIds.filter((id: string) => !ruleCreatorIds.includes(id));

    if (membersWithoutRules.length > 0) {
      return NextResponse.json(
        { error: "All members must contribute a rule before starting" },
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

    // Use transaction to update group and create call session
    const [updatedGroup, callSession] = await prisma.$transaction([
      prisma.group.update({
        where: { id: groupId },
        data: {
          status: "ACTIVE",
          startDate,
          endDate,
        },
      }),
      prisma.callSession.create({
        data: {
          groupId,
          scheduledAt: scheduledCallTime,
          status: "SCHEDULED",
        },
      }),
    ]);

    return NextResponse.json({
      message: "Challenge started!",
      group: updatedGroup,
      callSession,
    });
  } catch (error) {
    console.error("Error starting challenge:", error);
    return NextResponse.json(
      { error: "Failed to start challenge" },
      { status: 500 }
    );
  }
}
