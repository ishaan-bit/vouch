import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// Type for Prisma transaction client
type PrismaTransactionClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

interface RouteParams {
  params: Promise<{ id: string; requestId: string }>;
}

/**
 * POST /api/groups/[id]/join-requests/[requestId]/approve - Approve a join request
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, requestId } = await params;

    // Verify user is the group creator
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { 
        createdByUserId: true, 
        name: true,
        memberships: {
          select: { userId: true }
        }
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.createdByUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the creator can approve join requests" },
        { status: 403 }
      );
    }

    // Find the join request
    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: { id: true, name: true },
        },
        rule: true,
      },
    });

    if (!joinRequest) {
      return NextResponse.json({ error: "Join request not found" }, { status: 404 });
    }

    if (joinRequest.groupId !== groupId) {
      return NextResponse.json({ error: "Join request does not belong to this group" }, { status: 400 });
    }

    if (joinRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "This request has already been processed" },
        { status: 400 }
      );
    }

    // Approve the request in a transaction
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // Update join request status
      await tx.joinRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" },
      });

      // Approve the rule
      await tx.rule.update({
        where: { id: joinRequest.ruleId },
        data: { approved: true },
      });

      // Add user as a member
      await tx.groupMembership.create({
        data: {
          groupId,
          userId: joinRequest.userId,
          role: "MEMBER",
        },
      });

      // Notify the approved user
      await tx.notification.create({
        data: {
          userId: joinRequest.userId,
          type: "JOIN_APPROVED",
          title: "Request approved! 🎉",
          message: `Your request to join "${group.name}" has been approved`,
          data: {
            groupId,
            groupName: group.name,
          },
        },
      });

      // Notify ALL EXISTING members that someone new joined (P0 fix)
      const existingMemberIds = group.memberships
        .map(m => m.userId)
        .filter(id => id !== joinRequest.userId && id !== session.user.id);

      if (existingMemberIds.length > 0) {
        await tx.notification.createMany({
          data: existingMemberIds.map(memberId => ({
            userId: memberId,
            type: "PACT_MEMBER_ADDED" as const,
            title: "New pact member! 👋",
            message: `${joinRequest.user.name || "Someone"} just joined "${group.name}"`,
            data: {
              groupId,
              groupName: group.name,
              newMemberId: joinRequest.userId,
              newMemberName: joinRequest.user.name,
            },
          })),
        });
      }
    });

    return NextResponse.json({
      message: "Join request approved",
      userId: joinRequest.userId,
    });
  } catch (error) {
    console.error("Error approving join request:", error);
    return NextResponse.json(
      { error: "Failed to approve join request" },
      { status: 500 }
    );
  }
}
