import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/groups/[id]/delete/request - Creator requests pact deletion
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    // Fetch group with memberships
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
        paymentObligations: {
          where: { status: "PENDING" },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Only creator can request deletion
    if (group.createdByUserId !== session.user.id) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Only the pact creator can request deletion" },
        { status: 403 }
      );
    }

    // Check if already pending deletion
    if (group.deletionStatus === "PENDING") {
      return NextResponse.json(
        { error: "ALREADY_PENDING", message: "Deletion is already pending approval" },
        { status: 400 }
      );
    }

    // Check for pending settlements if pact is ACTIVE or COMPLETED
    if (group.status !== "PLANNING" && group.paymentObligations.length > 0) {
      return NextResponse.json(
        { 
          error: "PENDING_SETTLEMENTS", 
          message: "Cannot delete pact with pending settlements. Finalize payments first.",
          pendingCount: group.paymentObligations.length,
        },
        { status: 400 }
      );
    }

    // Set expiration (48 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Update group and create notifications in a transaction
    const otherMembers = group.memberships.filter(m => m.userId !== session.user.id);
    
    console.log(`[DELETE_REQUEST] Creator ${session.user.name} requesting deletion of group ${group.name}`);
    console.log(`[DELETE_REQUEST] Notifying ${otherMembers.length} other members`);

    await prisma.$transaction(async (tx) => {
      // Update group deletion status
      await tx.group.update({
        where: { id: groupId },
        data: {
          deletionStatus: "PENDING",
          deletionRequestedBy: session.user.id,
          deletionRequestedAt: new Date(),
          deletionExpiresAt: expiresAt,
        },
      });

      // Clear any existing votes
      await tx.groupDeletionVote.deleteMany({
        where: { groupId },
      });

      // Create creator's auto-approve vote
      await tx.groupDeletionVote.create({
        data: {
          groupId,
          userId: session.user.id,
          vote: "APPROVE",
        },
      });

      // Create notifications for other members
      if (otherMembers.length > 0) {
        await tx.notification.createMany({
          data: otherMembers.map(m => ({
            userId: m.userId,
            type: "PACT_DELETION_REQUESTED",
            title: "Pact deletion requested 🗑️",
            message: `${session.user.name || "The creator"} wants to delete "${group.name}". Your approval is needed.`,
            data: JSON.parse(JSON.stringify({
              groupId,
              groupName: group.name,
              requestedBy: session.user.id,
              requestedByName: session.user.name,
              expiresAt: expiresAt.toISOString(),
              action: "VOTE_DELETION",
              deepLink: `/groups/${groupId}`,
            })),
          })),
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: otherMembers.length > 0 
        ? `Deletion request sent to ${otherMembers.length} member(s). Awaiting approval.`
        : "Pact deleted (you were the only member).",
      expiresAt: expiresAt.toISOString(),
      votesNeeded: otherMembers.length,
    });
  } catch (error) {
    console.error("[DELETE_REQUEST] Error:", error);
    return NextResponse.json(
      { error: "Failed to request deletion" },
      { status: 500 }
    );
  }
}
