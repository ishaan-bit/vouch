import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { computePaymentObligations } from "@/lib/payouts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/calls/[id]/finalize - End voting and compute payment obligations
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const call = await prisma.callSession.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            memberships: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
            rules: {
              where: { approved: true },
              include: {
                creator: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        votes: true,
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if user is a member
    const isMember = call.group.memberships.some(
      (m: { userId: string }) => m.userId === session.user.id
    );
    if (!isMember) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (call.status !== "ONGOING") {
      return NextResponse.json(
        { error: "Call must be ongoing to finalize" },
        { status: 400 }
      );
    }

    // Check if all members have voted on all rules
    // Each rule creator must vote on all members (including themselves)
    const members = call.group.memberships;
    const rules = call.group.rules;
    const existingVotes = call.votes;

    // Build a set of all required votes (ruleId|voterId|targetUserId)
    const requiredVotes = new Set<string>();
    const missingVoters: { name: string | null; ruleTitle: string }[] = [];

    for (const rule of rules) {
      const ruleCreatorId = rule.creatorId;
      const ruleCreator = rule.creator;
      
      // Rule creator must vote on all members (including self)
      for (const membership of members) {
        const targetUserId = membership.userId;
        const voteKey = `${rule.id}|${ruleCreatorId}|${targetUserId}`;
        requiredVotes.add(voteKey);
      }
    }

    // Check which votes exist
    const existingVoteSet = new Set(
      existingVotes.map((v: { ruleId: string; voterId: string; targetUserId: string }) => 
        `${v.ruleId}|${v.voterId}|${v.targetUserId}`
      )
    );

    // Find missing votes
    for (const requiredVote of requiredVotes) {
      if (!existingVoteSet.has(requiredVote)) {
        const [ruleId, voterId] = requiredVote.split("|");
        const rule = rules.find((r: { id: string }) => r.id === ruleId);
        const voter = members.find((m: { userId: string }) => m.userId === voterId);
        if (rule && voter) {
          // Only add unique voter/rule combinations to missing list
          const alreadyAdded = missingVoters.some(
            (m) => m.name === voter.user.name && m.ruleTitle === rule.title
          );
          if (!alreadyAdded) {
            missingVoters.push({
              name: voter.user.name,
              ruleTitle: rule.title || "Untitled Rule",
            });
          }
        }
      }
    }

    if (missingVoters.length > 0) {
      // Group missing votes by voter
      const votersMissing = [...new Set(missingVoters.map((m) => m.name))];
      return NextResponse.json(
        { 
          error: "Not all members have finished voting",
          message: `Waiting for: ${votersMissing.filter(Boolean).join(", ")}`,
          missingVoters: votersMissing,
        },
        { status: 400 }
      );
    }

    // Compute and create payment obligations
    const obligations = await computePaymentObligations(id);

    // Mark call as completed
    await prisma.callSession.update({
      where: { id },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
      },
    });

    // Mark group as completed
    await prisma.group.update({
      where: { id: call.groupId },
      data: { status: "COMPLETED" },
    });

    // Update profile stats for all members - increment groupsCompleted and update streaks
    await Promise.all(
      members.map(async (m: { userId: string }) => {
        // Get current stats to calculate streak
        const stats = await prisma.profileStats.findUnique({
          where: { userId: m.userId },
        });
        
        const newGroupsCompleted = (stats?.groupsCompleted || 0) + 1;
        // For simplicity, we use groupsCompleted as a proxy for current streak
        // A more sophisticated approach would track consecutive completions by date
        const newLongestStreak = Math.max(stats?.longestStreak || 0, newGroupsCompleted);
        
        await prisma.profileStats.upsert({
          where: { userId: m.userId },
          create: { 
            userId: m.userId, 
            groupsCompleted: 1,
            longestStreak: 1,
          },
          update: { 
            groupsCompleted: { increment: 1 },
            longestStreak: newLongestStreak,
          },
        });
      })
    );

    // Notify all members (reuse members variable from above)
    await prisma.notification.createMany({
      data: members.map((m: { userId: string }) => ({
        userId: m.userId,
        type: "CYCLE_ENDED" as const,
        title: "Cycle completed!",
        message: `Voting finished for ${call.group.id}. Check your settlements.`,
        data: { callId: id, groupId: call.groupId },
      })),
    });

    return NextResponse.json({
      success: true,
      obligationsCreated: obligations.length,
      obligations,
    });
  } catch (error) {
    console.error("Error finalizing call:", error);
    return NextResponse.json(
      { error: "Failed to finalize call" },
      { status: 500 }
    );
  }
}
