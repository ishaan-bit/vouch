import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { inviteMembersSchema } from "@/lib/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/groups/[id]/invite - Invite members to a group
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const body = await request.json();
    const result = inviteMembersSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors.userIds?.[0] || "Invalid input" },
        { status: 400 }
      );
    }

    const { userIds } = result.data;

    // Check if the group exists and user is a member
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          select: { userId: true, role: true },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const userMembership = group.memberships.find((m) => m.userId === session.user.id);
    if (!userMembership) {
      return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
    }

    // Only allow invites during PLANNING phase
    if (group.status !== "PLANNING") {
      return NextResponse.json(
        { error: "Can only invite members during planning phase" },
        { status: 400 }
      );
    }

    // Filter out users who are already members
    const existingMemberIds = group.memberships.map((m) => m.userId);
    const newUserIds = userIds.filter((id) => !existingMemberIds.includes(id));

    if (newUserIds.length === 0) {
      return NextResponse.json(
        { error: "All selected users are already members" },
        { status: 400 }
      );
    }

    // Verify all users exist and are friends with the inviter
    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: newUserIds.flatMap((userId) => [
          { requesterId: session.user.id, receiverId: userId },
          { requesterId: userId, receiverId: session.user.id },
        ]),
      },
    });

    const friendIds = new Set(
      friendships.flatMap((f) => [f.requesterId, f.receiverId])
    );
    friendIds.delete(session.user.id);

    const validUserIds = newUserIds.filter((id) => friendIds.has(id));

    if (validUserIds.length === 0) {
      return NextResponse.json(
        { error: "You can only invite friends" },
        { status: 400 }
      );
    }

    // Add members and create notifications in a transaction
    await prisma.$transaction(async (tx) => {
      // Create memberships for new users
      await tx.groupMembership.createMany({
        data: validUserIds.map((userId) => ({
          groupId,
          userId,
          role: "MEMBER",
        })),
      });

      // Create notifications for invited users
      await tx.notification.createMany({
        data: validUserIds.map((userId) => ({
          userId,
          type: "GROUP_INVITE" as const,
          title: "You've been added to a pact!",
          message: `${session.user.name || "Someone"} added you to "${group.name}". Add your rule to join the game.`,
          data: { groupId, creatorId: session.user.id, groupName: group.name },
        })),
      });
    });

    return NextResponse.json(
      { message: `${validUserIds.length} member(s) invited successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error inviting members:", error);
    return NextResponse.json(
      { error: "Failed to invite members" },
      { status: 500 }
    );
  }
}
