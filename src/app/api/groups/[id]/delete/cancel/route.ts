import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/groups/[id]/delete/cancel - Creator cancels deletion request
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    // Fetch group
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Only creator can cancel
    if (group.createdByUserId !== session.user.id) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Only the pact creator can cancel deletion" },
        { status: 403 }
      );
    }

    // Check deletion is pending
    if (group.deletionStatus !== "PENDING") {
      return NextResponse.json(
        { error: "NOT_PENDING", message: "No deletion request is pending" },
        { status: 400 }
      );
    }

    console.log(`[DELETE_CANCEL] Creator ${session.user.name} cancelling deletion of group ${group.name}`);

    // Cancel the deletion
    await prisma.$transaction(async (tx) => {
      // Update group status
      await tx.group.update({
        where: { id: groupId },
        data: {
          deletionStatus: "NONE",
          deletionRequestedBy: null,
          deletionRequestedAt: null,
          deletionExpiresAt: null,
        },
      });

      // Clear votes
      await tx.groupDeletionVote.deleteMany({
        where: { groupId },
      });

      // Notify other members
      const otherMembers = group.memberships.filter(m => m.userId !== session.user.id);
      if (otherMembers.length > 0) {
        await tx.notification.createMany({
          data: otherMembers.map(m => ({
            userId: m.userId,
            type: "PACT_DELETION_CANCELLED",
            title: "Deletion cancelled",
            message: `${session.user.name || "The creator"} cancelled the deletion request for "${group.name}".`,
            data: JSON.parse(JSON.stringify({
              groupId,
              groupName: group.name,
            })),
          })),
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Deletion request cancelled",
    });
  } catch (error) {
    console.error("[DELETE_CANCEL] Error:", error);
    return NextResponse.json(
      { error: "Failed to cancel deletion" },
      { status: 500 }
    );
  }
}
