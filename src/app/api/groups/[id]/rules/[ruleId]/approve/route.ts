import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string; ruleId: string }>;
}

// POST /api/groups/[id]/rules/[ruleId]/approve - Approve a rule
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, ruleId } = await params;

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
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Get the rule
    const rule = await prisma.rule.findUnique({
      where: { id: ruleId },
      include: {
        approvals: true,
      },
    });

    if (!rule || rule.groupId !== groupId) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // Can't approve own rule
    if (rule.creatorId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot approve your own rule" },
        { status: 400 }
      );
    }

    // Check if already approved
    const existingApproval = await prisma.ruleApproval.findUnique({
      where: {
        ruleId_approverId: {
          ruleId,
          approverId: session.user.id,
        },
      },
    });

    if (existingApproval) {
      return NextResponse.json({ message: "Already approved" });
    }

    // Create approval
    const approval = await prisma.ruleApproval.create({
      data: {
        ruleId,
        approverId: session.user.id,
        approved: true,
      },
    });

    // Check if all members (except creator) have approved
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: true,
      },
    });

    if (group) {
      const membersExceptCreator = group.memberships.filter(
        (m: { userId: string }) => m.userId !== rule.creatorId
      );
      const approvalCount = await prisma.ruleApproval.count({
        where: {
          ruleId,
          approved: true,
        },
      });

      // Auto-approve rule if all members have approved
      if (approvalCount >= membersExceptCreator.length) {
        await prisma.rule.update({
          where: { id: ruleId },
          data: { approved: true },
        });
      }
    }

    return NextResponse.json({ 
      message: "Rule approved",
      approval 
    });
  } catch (error) {
    console.error("Error approving rule:", error);
    return NextResponse.json(
      { error: "Failed to approve rule" },
      { status: 500 }
    );
  }
}
