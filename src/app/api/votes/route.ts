import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

/**
 * POST /api/votes - Submit a vote
 * 
 * Body: { callSessionId, ruleId, targetUserId, value }
 * 
 * New voting model (group-wide rules):
 * - For each rule, ALL members vote on whether each OTHER member followed it
 * - You cannot vote on yourself
 * - Majority YES = member followed the rule
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callSessionId, ruleId, targetUserId, value } = await request.json();

    if (!callSessionId || !ruleId || !targetUserId || !value) {
      return NextResponse.json(
        { error: "callSessionId, ruleId, targetUserId, and value are required" },
        { status: 400 }
      );
    }

    if (!["YES", "NO", "SKIP"].includes(value)) {
      return NextResponse.json(
        { error: "value must be YES, NO, or SKIP" },
        { status: 400 }
      );
    }

    // Cannot vote on yourself
    if (targetUserId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot vote on yourself" },
        { status: 400 }
      );
    }

    // Get the call session
    const call = await prisma.callSession.findUnique({
      where: { id: callSessionId },
      include: {
        group: {
          include: { memberships: true },
        },
      },
    });

    if (!call) {
      return NextResponse.json(
        { error: "Call session not found" },
        { status: 404 }
      );
    }

    // Check if user is a member
    const isMember = call.group.memberships.some(
      (m: { userId: string }) => m.userId === session.user.id
    );
    if (!isMember) {
      return NextResponse.json(
        { error: "Not a member of this group" },
        { status: 403 }
      );
    }

    // Check if target is a member
    const targetIsMember = call.group.memberships.some(
      (m: { userId: string }) => m.userId === targetUserId
    );
    if (!targetIsMember) {
      return NextResponse.json(
        { error: "Target user is not a member of this group" },
        { status: 403 }
      );
    }

    if (call.status !== "ONGOING") {
      return NextResponse.json(
        { error: "Voting is only allowed during active calls" },
        { status: 400 }
      );
    }

    // Get the rule
    const rule = await prisma.rule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || rule.groupId !== call.groupId) {
      return NextResponse.json(
        { error: "Rule not found in this group" },
        { status: 404 }
      );
    }

    // Upsert the vote
    const vote = await prisma.ruleVote.upsert({
      where: {
        callSessionId_ruleId_voterId_targetUserId: {
          callSessionId,
          ruleId,
          voterId: session.user.id,
          targetUserId,
        },
      },
      create: {
        callSessionId,
        ruleId,
        voterId: session.user.id,
        targetUserId,
        value,
      },
      update: {
        value,
      },
    });

    return NextResponse.json(vote);
  } catch (error) {
    console.error("Error submitting vote:", error);
    return NextResponse.json(
      { error: "Failed to submit vote" },
      { status: 500 }
    );
  }
}

// GET /api/votes?callSessionId=xxx - Get all votes for a call
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const callSessionId = searchParams.get("callSessionId");

    if (!callSessionId) {
      return NextResponse.json(
        { error: "callSessionId is required" },
        { status: 400 }
      );
    }

    // Get the call
    const call = await prisma.callSession.findUnique({
      where: { id: callSessionId },
      include: {
        group: {
          include: { memberships: true },
        },
      },
    });

    if (!call) {
      return NextResponse.json(
        { error: "Call session not found" },
        { status: 404 }
      );
    }

    // Check if user is a member
    const isMember = call.group.memberships.some(
      (m: { userId: string }) => m.userId === session.user.id
    );
    if (!isMember) {
      return NextResponse.json(
        { error: "Not a member of this group" },
        { status: 403 }
      );
    }

    const votes = await prisma.ruleVote.findMany({
      where: { callSessionId },
      include: {
        voter: {
          select: { id: true, name: true, avatarUrl: true },
        },
        targetUser: {
          select: { id: true, name: true, avatarUrl: true },
        },
        rule: {
          select: { id: true, title: true, description: true },
        },
      },
    });

    return NextResponse.json(votes);
  } catch (error) {
    console.error("Error fetching votes:", error);
    return NextResponse.json(
      { error: "Failed to fetch votes" },
      { status: 500 }
    );
  }
}
