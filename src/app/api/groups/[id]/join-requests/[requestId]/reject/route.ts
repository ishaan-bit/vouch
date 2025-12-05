import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// Type for Prisma transaction client
type PrismaTransactionClient = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

interface RouteParams {
  params: Promise<{ id: string; requestId: string }>;
}

/**
 * POST /api/groups/[id]/join-requests/[requestId]/reject - Reject a join request
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
      select: { createdByUserId: true, name: true },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.createdByUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the creator can reject join requests" },
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

    // Reject the request in a transaction
    await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // Update join request status
      await tx.joinRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED" },
      });

      // Delete the associated rule
      await tx.rule.delete({
        where: { id: joinRequest.ruleId },
      });

      // Notify the user
      await tx.notification.create({
        data: {
          userId: joinRequest.userId,
          type: "JOIN_REJECTED",
          title: "Request not approved",
          message: `Your request to join "${group.name}" was not approved`,
          data: {
            groupId,
            groupName: group.name,
          },
        },
      });
    });

    return NextResponse.json({
      message: "Join request rejected",
    });
  } catch (error) {
    console.error("Error rejecting join request:", error);
    return NextResponse.json(
      { error: "Failed to reject join request" },
      { status: 500 }
    );
  }
}
