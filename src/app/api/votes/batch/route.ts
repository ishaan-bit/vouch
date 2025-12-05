import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface VoteInput {
  ruleId: string;
  targetUserId: string;
  value: "YES" | "NO" | "SKIP";
}

/**
 * POST /api/votes/batch - Submit multiple votes at once
 * 
 * Body: { callSessionId, votes: [{ ruleId, targetUserId, value }] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callSessionId, votes } = await request.json();

    if (!callSessionId || !votes || !Array.isArray(votes)) {
      return NextResponse.json(
        { error: "callSessionId and votes array are required" },
        { status: 400 }
      );
    }

    // Validate votes array
    for (const vote of votes as VoteInput[]) {
      if (!vote.ruleId || !vote.targetUserId || !vote.value) {
        return NextResponse.json(
          { error: "Each vote must have ruleId, targetUserId, and value" },
          { status: 400 }
        );
      }
      if (!["YES", "NO", "SKIP"].includes(vote.value)) {
        return NextResponse.json(
          { error: "value must be YES, NO, or SKIP" },
          { status: 400 }
        );
      }
      if (vote.targetUserId === session.user.id) {
        return NextResponse.json(
          { error: "Cannot vote on yourself" },
          { status: 400 }
        );
      }
    }

    // Get the call session
    const call = await prisma.callSession.findUnique({
      where: { id: callSessionId },
      include: {
        group: {
          include: { 
            memberships: true,
            rules: true,
          },
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

    if (call.status !== "ONGOING") {
      return NextResponse.json(
        { error: "Voting is only allowed during active calls" },
        { status: 400 }
      );
    }

    // Validate all ruleIds and targetUserIds
    const memberIds = call.group.memberships.map((m: { userId: string }) => m.userId);
    const ruleIds = call.group.rules.map((r: { id: string }) => r.id);

    for (const vote of votes as VoteInput[]) {
      if (!ruleIds.includes(vote.ruleId)) {
        return NextResponse.json(
          { error: `Rule ${vote.ruleId} not found in this group` },
          { status: 404 }
        );
      }
      if (!memberIds.includes(vote.targetUserId)) {
        return NextResponse.json(
          { error: `User ${vote.targetUserId} is not a member of this group` },
          { status: 403 }
        );
      }
    }

    // Upsert all votes in a transaction
    const results = await prisma.$transaction(
      (votes as VoteInput[]).map((vote) =>
        prisma.ruleVote.upsert({
          where: {
            callSessionId_ruleId_voterId_targetUserId: {
              callSessionId,
              ruleId: vote.ruleId,
              voterId: session.user.id,
              targetUserId: vote.targetUserId,
            },
          },
          create: {
            callSessionId,
            ruleId: vote.ruleId,
            voterId: session.user.id,
            targetUserId: vote.targetUserId,
            value: vote.value,
          },
          update: {
            value: vote.value,
          },
        })
      )
    );

    return NextResponse.json({
      message: `${results.length} votes submitted`,
      count: results.length,
    });
  } catch (error) {
    console.error("Error submitting batch votes:", error);
    return NextResponse.json(
      { error: "Failed to submit votes" },
      { status: 500 }
    );
  }
}
