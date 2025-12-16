import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { computePaymentObligations } from "@/lib/payouts";

// Error codes for finalize endpoint
type FinalizeErrorCode = 
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CALL_NOT_ONGOING"
  | "CALL_NOT_ENDED"
  | "ALREADY_FINALIZED"
  | "MISSING_VOTES"
  | "NO_RULES"
  | "INTERNAL_ERROR";

interface FinalizeErrorResponse {
  error: FinalizeErrorCode;
  message: string;
  details?: {
    missingVoters?: { id: string; name: string | null; pendingRules: string[] }[];
    votedCount?: number;
    totalRequired?: number;
    callStatus?: string;
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/calls/[id]/finalize - End voting and compute payment obligations
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      const errorResponse: FinalizeErrorResponse = {
        error: "UNAUTHORIZED",
        message: "You must be logged in to finalize a call",
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const { id } = await params;
    console.log(`[FINALIZE] Starting finalize for call ${id}`);

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
      const errorResponse: FinalizeErrorResponse = {
        error: "NOT_FOUND",
        message: "Call session not found",
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Check if user is a member
    const isMember = call.group.memberships.some(
      (m: { userId: string }) => m.userId === session.user.id
    );
    if (!isMember) {
      const errorResponse: FinalizeErrorResponse = {
        error: "FORBIDDEN",
        message: "You are not a member of this group",
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    // Check call status
    if (call.status === "COMPLETED") {
      const errorResponse: FinalizeErrorResponse = {
        error: "ALREADY_FINALIZED",
        message: "This call has already been finalized",
        details: { callStatus: call.status },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (call.status !== "ONGOING" && call.status !== "SCHEDULED") {
      const errorResponse: FinalizeErrorResponse = {
        error: "CALL_NOT_ONGOING",
        message: `Call must be in ONGOING or SCHEDULED state to finalize. Current state: ${call.status}`,
        details: { callStatus: call.status },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const members = call.group.memberships;
    const rules = call.group.rules;
    const existingVotes = call.votes;

    // Check if there are any approved rules
    if (rules.length === 0) {
      const errorResponse: FinalizeErrorResponse = {
        error: "NO_RULES",
        message: "No approved rules to vote on. All rules must be approved before finalizing.",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.log(`[FINALIZE] Members: ${members.length}, Rules: ${rules.length}, Votes: ${existingVotes.length}`);

    // Build voting requirements: each member votes on all OTHER members for ALL rules
    // (You don't vote on yourself)
    const requiredVotes = new Map<string, Set<string>>(); // voterId -> Set of required voteKeys
    const missingVotersMap = new Map<string, { id: string; name: string | null; pendingRules: string[] }>();

    for (const voter of members) {
      const voterId = voter.userId;
      const voterName = voter.user.name;
      
      for (const rule of rules) {
        for (const target of members) {
          // Skip self-votes
          if (target.userId === voterId) continue;
          
          const voteKey = `${rule.id}|${voterId}|${target.userId}`;
          if (!requiredVotes.has(voterId)) {
            requiredVotes.set(voterId, new Set());
          }
          requiredVotes.get(voterId)!.add(voteKey);
        }
      }
    }

    // Check which votes exist
    const existingVoteSet = new Set(
      existingVotes.map((v: { ruleId: string; voterId: string; targetUserId: string }) => 
        `${v.ruleId}|${v.voterId}|${v.targetUserId}`
      )
    );

    // Find missing votes per voter
    let totalRequired = 0;
    let totalVoted = 0;

    for (const [voterId, requiredVoteKeys] of requiredVotes) {
      const voter = members.find((m: { userId: string }) => m.userId === voterId);
      const voterName = voter?.user.name || "Unknown";
      
      const missingRules: string[] = [];
      
      for (const voteKey of requiredVoteKeys) {
        totalRequired++;
        if (existingVoteSet.has(voteKey)) {
          totalVoted++;
        } else {
          const [ruleId] = voteKey.split("|");
          const rule = rules.find((r: { id: string }) => r.id === ruleId);
          if (rule && !missingRules.includes(rule.title)) {
            missingRules.push(rule.title);
          }
        }
      }
      
      if (missingRules.length > 0) {
        missingVotersMap.set(voterId, {
          id: voterId,
          name: voterName,
          pendingRules: missingRules,
        });
      }
    }

    console.log(`[FINALIZE] Votes: ${totalVoted}/${totalRequired}`);

    if (missingVotersMap.size > 0) {
      const missingVoters = Array.from(missingVotersMap.values());
      const voterNames = missingVoters.map(v => v.name || "Unknown").join(", ");
      
      const errorResponse: FinalizeErrorResponse = {
        error: "MISSING_VOTES",
        message: `Waiting for ${missingVoters.length} member(s) to complete voting: ${voterNames}`,
        details: {
          missingVoters,
          votedCount: totalVoted,
          totalRequired,
        },
      };
      console.log(`[FINALIZE] Missing votes:`, missingVoters);
      return NextResponse.json(errorResponse, { status: 400 });
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
    console.error("[FINALIZE] Error finalizing call:", error);
    const errorResponse: FinalizeErrorResponse = {
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred while finalizing the call",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
