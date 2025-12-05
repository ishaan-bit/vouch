import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/groups/[id]/rules/approve - Approve or reject a rule
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const body = await request.json();
    const { ruleId, approved } = body;

    if (!ruleId || typeof approved !== "boolean") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
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

    // Create or update approval
    const approval = await prisma.ruleApproval.upsert({
      where: {
        ruleId_approverId: {
          ruleId,
          approverId: session.user.id,
        },
      },
      update: { approved },
      create: {
        ruleId,
        approverId: session.user.id,
        approved,
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
      const nonCreatorMembers = group.memberships.filter(
        (m: { userId: string }) => m.userId !== rule.creatorId
      );
      
      const allApprovals = await prisma.ruleApproval.findMany({
        where: { ruleId },
      });

      const allApproved =
        nonCreatorMembers.length > 0 &&
        nonCreatorMembers.every((m: { userId: string }) =>
          allApprovals.some((a: { approverId: string; approved: boolean }) => a.approverId === m.userId && a.approved)
        );

      if (allApproved && !rule.approved) {
        await prisma.rule.update({
          where: { id: ruleId },
          data: { approved: true },
        });
      }
    }

    return NextResponse.json(approval);
  } catch (error) {
    console.error("Error approving rule:", error);
    return NextResponse.json(
      { error: "Failed to approve rule" },
      { status: 500 }
    );
  }
}
