import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const voteSchema = z.object({
  vote: z.enum(["APPROVE", "DECLINE"]),
});

// POST /api/groups/[id]/delete/vote - Member votes on deletion
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const body = await request.json();
    
    const result = voteSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "vote must be APPROVE or DECLINE" },
        { status: 400 }
      );
    }

    const { vote } = result.data;

    // Fetch group with memberships and existing votes
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
        deletionVotes: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check user is a member
    const membership = group.memberships.find(m => m.userId === session.user.id);
    if (!membership) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You are not a member of this pact" },
        { status: 403 }
      );
    }

    // Check deletion is pending
    if (group.deletionStatus !== "PENDING") {
      return NextResponse.json(
        { error: "NOT_PENDING", message: "No deletion request is pending for this pact" },
        { status: 400 }
      );
    }

    // Check if expired
    if (group.deletionExpiresAt && new Date() > group.deletionExpiresAt) {
      // Auto-expire the request
      await prisma.group.update({
        where: { id: groupId },
        data: { deletionStatus: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "EXPIRED", message: "The deletion request has expired" },
        { status: 400 }
      );
    }

    // Check if already voted
    const existingVote = group.deletionVotes.find(v => v.userId === session.user.id);
    if (existingVote) {
      return NextResponse.json(
        { error: "ALREADY_VOTED", message: "You have already voted on this deletion" },
        { status: 400 }
      );
    }

    const creator = group.memberships.find(m => m.userId === group.createdByUserId);
    const creatorName = creator?.user.name || "The creator";

    console.log(`[DELETE_VOTE] User ${session.user.name} voting ${vote} on group ${group.name}`);

    // Record the vote
    await prisma.groupDeletionVote.create({
      data: {
        groupId,
        userId: session.user.id,
        vote: vote,
      },
    });

    // Notify creator of the vote
    await prisma.notification.create({
      data: {
        userId: group.createdByUserId,
        type: "PACT_DELETION_VOTE",
        title: vote === "APPROVE" ? "Deletion approved ✅" : "Deletion declined ❌",
        message: `${session.user.name || "A member"} ${vote === "APPROVE" ? "approved" : "declined"} the deletion of "${group.name}".`,
        data: JSON.parse(JSON.stringify({
          groupId,
          groupName: group.name,
          voterId: session.user.id,
          voterName: session.user.name,
          vote,
        })),
      },
    });

    // If declined, cancel the deletion request
    if (vote === "DECLINE") {
      console.log(`[DELETE_VOTE] Deletion declined by ${session.user.name}, cancelling request`);
      
      await prisma.group.update({
        where: { id: groupId },
        data: { deletionStatus: "DECLINED" },
      });

      // Notify all members that deletion was declined
      const otherMembers = group.memberships.filter(m => m.userId !== session.user.id);
      if (otherMembers.length > 0) {
        await prisma.notification.createMany({
          data: otherMembers.map(m => ({
            userId: m.userId,
            type: "PACT_DELETION_DECLINED",
            title: "Pact deletion cancelled",
            message: `${session.user.name || "A member"} declined the deletion of "${group.name}".`,
            data: JSON.parse(JSON.stringify({
              groupId,
              groupName: group.name,
              declinedBy: session.user.id,
              declinedByName: session.user.name,
            })),
          })),
        });
      }

      return NextResponse.json({
        success: true,
        status: "DECLINED",
        message: "Deletion request cancelled",
      });
    }

    // Check if all members have approved
    const totalMembers = group.memberships.length;
    const approveCount = group.deletionVotes.filter(v => v.vote === "APPROVE").length + 1; // +1 for current vote
    
    console.log(`[DELETE_VOTE] Approve count: ${approveCount}/${totalMembers}`);

    if (approveCount >= totalMembers) {
      console.log(`[DELETE_VOTE] All members approved, deleting group ${group.name}`);
      
      // All approved - delete the group
      await prisma.$transaction(async (tx) => {
        // Notify all members
        await tx.notification.createMany({
          data: group.memberships.map(m => ({
            userId: m.userId,
            type: "PACT_DELETION_APPROVED",
            title: "Pact deleted 🗑️",
            message: `"${group.name}" has been deleted with unanimous consent.`,
            data: JSON.parse(JSON.stringify({
              groupId,
              groupName: group.name,
            })),
          })),
        });

        // Delete the group (cascades to related records)
        await tx.group.delete({
          where: { id: groupId },
        });
      });

      return NextResponse.json({
        success: true,
        status: "DELETED",
        message: "All members approved. Pact has been deleted.",
      });
    }

    // Still waiting for more votes
    const pendingMembers = group.memberships.filter(
      m => !group.deletionVotes.some(v => v.userId === m.userId) && m.userId !== session.user.id
    );

    return NextResponse.json({
      success: true,
      status: "PENDING",
      message: `Vote recorded. Waiting for ${pendingMembers.length} more approval(s).`,
      approvedCount: approveCount,
      totalMembers,
      pendingMembers: pendingMembers.map(m => ({
        id: m.userId,
        name: m.user.name,
      })),
    });
  } catch (error) {
    console.error("[DELETE_VOTE] Error:", error);
    return NextResponse.json(
      { error: "Failed to record vote" },
      { status: 500 }
    );
  }
}
