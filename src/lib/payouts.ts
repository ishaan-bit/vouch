/**
 * Payout Computation Logic
 * Calculates payment obligations based on votes at end-of-cycle calls
 * 
 * VOTING MODEL:
 * - Each rule creator votes on which OTHER members followed their rule
 * - Only the rule creator's votes matter for their rule
 * - If creator votes YES for a member, creator pays that member the stakeAmount
 */

import prisma from "./db";

export interface ComputedObligation {
  fromUserId: string;
  toUserId: string;
  ruleId: string;
  amount: number;
}

interface RuleInfo {
  id: string;
  creatorId: string;
  stakeAmount: number;
}

/**
 * Compute payment obligations for a completed call session
 * 
 * Algorithm:
 * 1. Fetch all RuleVote rows for this callSessionId where vote = YES
 * 2. For each YES vote:
 *    - Get the associated Rule
 *    - Only consider votes where the voter is the rule creator
 *    - fromUserId = rule.creatorId (the voter)
 *    - toUserId = targetUserId (the member who followed)
 *    - amount = rule.stakeAmount
 * 3. Accumulate amounts by (fromUserId, toUserId) pair
 * 4. Create/update PaymentObligation records
 */
export async function computePaymentObligations(
  callSessionId: string
): Promise<ComputedObligation[]> {
  // Fetch the call session with group info
  const callSession = await prisma.callSession.findUnique({
    where: { id: callSessionId },
    include: {
      group: {
        include: {
          rules: {
            select: {
              id: true,
              creatorId: true,
              stakeAmount: true,
            },
          },
        },
      },
    },
  });

  if (!callSession) {
    throw new Error(`Call session ${callSessionId} not found`);
  }

  // Fetch all YES votes for this call session
  const yesVotes = await prisma.ruleVote.findMany({
    where: {
      callSessionId,
      value: "YES",
    },
  });

  // Build a map of ruleId -> rule for quick lookup
  const ruleMap = new Map<string, RuleInfo>(
    callSession.group.rules.map((r: RuleInfo) => [r.id, r])
  );

  // Accumulate obligations: "fromUserId|toUserId" -> { ruleId, amount }[]
  const obligationMap = new Map<string, { ruleId: string; amount: number }[]>();

  for (const vote of yesVotes) {
    const rule = ruleMap.get(vote.ruleId);
    if (!rule) continue;

    // IMPORTANT: Only count votes where the voter IS the rule creator
    // This is the key constraint - only the rule creator decides payouts for their rule
    if (vote.voterId !== rule.creatorId) {
      continue;
    }

    // Skip self-votes - they don't create payment obligations between users
    // Self-NO votes are handled separately (cause losses)
    if (vote.voterId === vote.targetUserId) {
      continue;
    }

    // Creator voted YES for this member following their rule
    // So creator owes the member the stake amount
    const key = `${vote.voterId}|${vote.targetUserId}`;
    
    if (!obligationMap.has(key)) {
      obligationMap.set(key, []);
    }
    obligationMap.get(key)!.push({
      ruleId: rule.id,
      amount: rule.stakeAmount,
    });
  }

  // Handle self-NO votes (cause losses)
  const noVotes = await prisma.ruleVote.findMany({
    where: {
      callSessionId,
      value: "NO",
    },
  });

  for (const vote of noVotes) {
    const rule = ruleMap.get(vote.ruleId);
    if (!rule) continue;

    // Only process self-NO votes where voter is the rule creator
    if (vote.voterId !== rule.creatorId) continue;
    if (vote.voterId !== vote.targetUserId) continue;

    // Creator voted NO on themselves - create/update a cause loss
    // Check if one already exists
    const existingCauseLoss = await prisma.causeLoss.findFirst({
      where: {
        userId: vote.voterId,
        groupId: callSession.groupId,
        ruleId: rule.id,
        cycleId: callSessionId,
      },
    });

    if (existingCauseLoss) {
      await prisma.causeLoss.update({
        where: { id: existingCauseLoss.id },
        data: {
          amount: rule.stakeAmount,
          status: "PLEDGED",
        },
      });
    } else {
      await prisma.causeLoss.create({
        data: {
          userId: vote.voterId,
          groupId: callSession.groupId,
          ruleId: rule.id,
          cycleId: callSessionId,
          amount: rule.stakeAmount,
          status: "PLEDGED",
        },
      });
    }

    // Create notification for cause loss (only if new)
    if (!existingCauseLoss) {
      await prisma.notification.create({
        data: {
          userId: vote.voterId,
          type: "CAUSE_LOSS_PROMPT",
          title: "Vouch for a Cause",
          message: `You didn't follow your own rule. Consider donating ₹${rule.stakeAmount / 100} to a cause that matters to you.`,
          data: JSON.stringify({ 
            groupId: callSession.groupId, 
            ruleId: rule.id, 
            amount: rule.stakeAmount 
          }),
        },
      });
    }
  }

  // Convert to obligation records and save to database
  const obligations: ComputedObligation[] = [];

  for (const [key, items] of obligationMap) {
    const [fromUserId, toUserId] = key.split("|");
    
    // Create individual obligations per rule (for tracking)
    for (const item of items) {
      obligations.push({
        fromUserId,
        toUserId,
        ruleId: item.ruleId,
        amount: item.amount,
      });

      // Upsert to database
      await prisma.paymentObligation.upsert({
        where: {
          groupId_ruleId_fromUserId_toUserId: {
            groupId: callSession.groupId,
            ruleId: item.ruleId,
            fromUserId,
            toUserId,
          },
        },
        update: {
          amount: item.amount,
          callSessionId,
        },
        create: {
          groupId: callSession.groupId,
          callSessionId,
          ruleId: item.ruleId,
          fromUserId,
          toUserId,
          amount: item.amount,
        },
      });
    }
  }

  return obligations;
}

/**
 * Get obligations for a user (what they owe and what they receive)
 */
export async function getUserObligations(userId: string, groupId?: string) {
  const whereClause = groupId ? { groupId } : {};

  const [owed, receiving] = await Promise.all([
    // What user owes to others
    prisma.paymentObligation.findMany({
      where: {
        ...whereClause,
        fromUserId: userId,
      },
      include: {
        toUser: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            upiId: true,
          },
        },
        rule: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    // What user receives from others
    prisma.paymentObligation.findMany({
      where: {
        ...whereClause,
        toUserId: userId,
      },
      include: {
        fromUser: {
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
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return { owed, receiving };
}

/**
 * Get all obligations for a specific call session
 */
export async function getCallSessionObligations(callSessionId: string) {
  return prisma.paymentObligation.findMany({
    where: { callSessionId },
    include: {
      fromUser: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
        },
      },
      toUser: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          upiId: true,
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
      createdAt: "asc",
    },
  });
}

/**
 * Calculate net balances between users in a group
 * Simplifies multiple obligations into net amounts
 */
export async function calculateNetBalances(groupId: string) {
  const obligations = await prisma.paymentObligation.findMany({
    where: { 
      groupId,
      status: "PENDING",
    },
  });

  // Build net balance map: "userA|userB" -> netAmount (positive = A owes B)
  const netMap = new Map<string, number>();

  for (const ob of obligations) {
    // Sort user IDs to ensure consistent key
    const [userA, userB] = [ob.fromUserId, ob.toUserId].sort();
    const key = `${userA}|${userB}`;
    
    const existing = netMap.get(key) || 0;
    if (ob.fromUserId === userA) {
      // fromUser (A) owes toUser (B), so positive
      netMap.set(key, existing + ob.amount);
    } else {
      // fromUser (B) owes toUser (A), so negative
      netMap.set(key, existing - ob.amount);
    }
  }

  // Convert to array with proper direction
  const netBalances: { fromUserId: string; toUserId: string; amount: number }[] = [];
  for (const [key, amount] of netMap) {
    if (amount === 0) continue;
    
    const [userA, userB] = key.split("|");
    if (amount > 0) {
      netBalances.push({ fromUserId: userA, toUserId: userB, amount });
    } else {
      netBalances.push({ fromUserId: userB, toUserId: userA, amount: -amount });
    }
  }

  return netBalances;
}

/**
 * Mark an obligation as paid (by the payer)
 */
export async function markObligationPaid(obligationId: string, userId: string) {
  const obligation = await prisma.paymentObligation.findUnique({
    where: { id: obligationId },
  });

  if (!obligation) {
    throw new Error("Obligation not found");
  }

  if (obligation.fromUserId !== userId) {
    throw new Error("Only the payer can mark an obligation as paid");
  }

  return prisma.paymentObligation.update({
    where: { id: obligationId },
    data: { status: "MARKED_PAID" },
  });
}

/**
 * Confirm an obligation was received (by the payee)
 */
export async function confirmObligationReceived(obligationId: string, userId: string) {
  const obligation = await prisma.paymentObligation.findUnique({
    where: { id: obligationId },
  });

  if (!obligation) {
    throw new Error("Obligation not found");
  }

  if (obligation.toUserId !== userId) {
    throw new Error("Only the payee can confirm receipt");
  }

  if (obligation.status !== "MARKED_PAID") {
    throw new Error("Payment must be marked as paid first");
  }

  // Update obligation and user stats
  const [updated] = await prisma.$transaction([
    prisma.paymentObligation.update({
      where: { id: obligationId },
      data: { 
        status: "CONFIRMED",
        settledAt: new Date(),
      },
    }),
    // Update payer's totalPaid stat
    prisma.profileStats.upsert({
      where: { userId: obligation.fromUserId },
      create: {
        userId: obligation.fromUserId,
        totalPaid: obligation.amount,
      },
      update: {
        totalPaid: { increment: obligation.amount },
      },
    }),
    // Update payee's totalEarned stat
    prisma.profileStats.upsert({
      where: { userId: obligation.toUserId },
      create: {
        userId: obligation.toUserId,
        totalEarned: obligation.amount,
      },
      update: {
        totalEarned: { increment: obligation.amount },
      },
    }),
  ]);

  return updated;
}
