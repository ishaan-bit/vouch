import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/groups/[id]/delete/status - Get deletion status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    // Fetch group with deletion info
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
        deletionVotes: {
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

    // Check user is a member
    const membership = group.memberships.find(m => m.userId === session.user.id);
    if (!membership) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "You are not a member of this pact" },
        { status: 403 }
      );
    }

    // Check if expired and auto-update
    if (
      group.deletionStatus === "PENDING" &&
      group.deletionExpiresAt &&
      new Date() > group.deletionExpiresAt
    ) {
      await prisma.group.update({
        where: { id: groupId },
        data: { deletionStatus: "EXPIRED" },
      });
      group.deletionStatus = "EXPIRED";
    }

    // Build response
    const isCreator = group.createdByUserId === session.user.id;
    const currentUserVote = group.deletionVotes.find(v => v.userId === session.user.id);

    const approvedMembers = group.deletionVotes
      .filter(v => v.vote === "APPROVE")
      .map(v => ({ id: v.userId, name: v.user.name }));

    const pendingMembers = group.memberships
      .filter(m => !group.deletionVotes.some(v => v.userId === m.userId))
      .map(m => ({ id: m.userId, name: m.user.name, avatarUrl: m.user.avatarUrl }));

    return NextResponse.json({
      status: group.deletionStatus,
      requestedBy: group.deletionRequestedBy,
      requestedAt: group.deletionRequestedAt,
      expiresAt: group.deletionExpiresAt,
      isCreator,
      hasVoted: !!currentUserVote,
      myVote: currentUserVote?.vote || null,
      approvedCount: approvedMembers.length,
      totalMembers: group.memberships.length,
      approvedMembers,
      pendingMembers,
    });
  } catch (error) {
    console.error("[DELETE_STATUS] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deletion status" },
      { status: 500 }
    );
  }
}
