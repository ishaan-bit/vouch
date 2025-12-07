import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/groups/[id]/leave - Leave a pact (for non-creator members)
 * 
 * Only allowed during PLANNING phase.
 * Creators cannot leave - they must delete the pact instead.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const userId = session.user.id;

    // Get the group and membership info
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          where: { userId },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Pact not found" }, { status: 404 });
    }

    // Check if user is a member
    const membership = group.memberships[0];
    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this pact" }, { status: 400 });
    }

    // Creators cannot leave - they must delete the pact
    if (group.createdByUserId === userId) {
      return NextResponse.json(
        { error: "As the creator, you cannot leave. You can delete the pact instead." },
        { status: 400 }
      );
    }

    // Can only leave during PLANNING phase
    if (group.status !== "PLANNING") {
      return NextResponse.json(
        { error: "You can only leave a pact during the planning phase" },
        { status: 400 }
      );
    }

    // Delete the membership and any rules the user created for this pact
    await prisma.$transaction([
      // Delete user's rules for this pact
      prisma.rule.deleteMany({
        where: {
          groupId,
          creatorId: userId,
        },
      }),
      // Delete the membership
      prisma.groupMembership.delete({
        where: {
          groupId_userId: {
            groupId,
            userId,
          },
        },
      }),
    ]);

    console.log(`User ${userId} left pact ${groupId}`);

    return NextResponse.json({ success: true, message: "You have left the pact" });
  } catch (error) {
    console.error("Error leaving pact:", error);
    return NextResponse.json(
      { error: "Failed to leave pact" },
      { status: 500 }
    );
  }
}
