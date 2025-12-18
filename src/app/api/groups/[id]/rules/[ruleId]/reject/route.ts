import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string; ruleId: string }>;
}

// POST /api/groups/[id]/rules/[ruleId]/reject - Reject a rule
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

    // Get the rule with creator info
    const rule = await prisma.rule.findUnique({
      where: { id: ruleId },
      include: {
        creator: {
          select: { id: true, name: true },
        },
        group: {
          select: { name: true },
        },
      },
    });

    if (!rule || rule.groupId !== groupId) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // Can't reject own rule
    if (rule.creatorId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot reject your own rule" },
        { status: 400 }
      );
    }

    // Delete the rule (rejection removes it)
    await prisma.rule.delete({
      where: { id: ruleId },
    });

    // Notify the rule creator that their rule was rejected
    await prisma.notification.create({
      data: {
        userId: rule.creatorId,
        type: "OTHER",
        title: "Rule rejected ❌",
        message: `${session.user.name || "A pact member"} rejected your rule "${rule.title}" in "${rule.group.name}"`,
        data: {
          notificationType: "RULE_REJECTED",
          groupId,
          groupName: rule.group.name,
          ruleTitle: rule.title,
          rejectorId: session.user.id,
          rejectorName: session.user.name,
        },
      },
    });

    return NextResponse.json({ 
      message: "Rule rejected and removed",
      deletedRuleId: ruleId
    });
  } catch (error) {
    console.error("Error rejecting rule:", error);
    return NextResponse.json(
      { error: "Failed to reject rule" },
      { status: 500 }
    );
  }
}
