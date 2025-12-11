import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE /api/friends/[id] - Remove a friend (unfriend)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: friendshipId } = await params;

    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    // Verify user is part of this friendship
    if (friendship.requesterId !== session.user.id && friendship.receiverId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Delete the friendship
    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing friend:", error);
    return NextResponse.json(
      { error: "Failed to remove friend" },
      { status: 500 }
    );
  }
}

// PATCH /api/friends/[id] - Update friendship (e.g., block)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: friendshipId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== "block" && action !== "unblock") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    // Verify user is part of this friendship
    if (friendship.requesterId !== session.user.id && friendship.receiverId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (action === "block") {
      // Update to blocked status
      // We need to track who blocked whom, so we'll update the requester to be the blocker
      await prisma.friendship.update({
        where: { id: friendshipId },
        data: {
          status: "BLOCKED",
          requesterId: session.user.id, // The blocker becomes the requester
          receiverId: friendship.requesterId === session.user.id ? friendship.receiverId : friendship.requesterId,
        },
      });
    } else {
      // Unblock - delete the friendship entirely
      await prisma.friendship.delete({
        where: { id: friendshipId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating friendship:", error);
    return NextResponse.json(
      { error: "Failed to update friendship" },
      { status: 500 }
    );
  }
}
