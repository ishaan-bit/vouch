import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/users/block - Block a user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId: targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for existing friendship
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: session.user.id, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: session.user.id },
        ],
      },
    });

    if (existingFriendship) {
      // Update existing to BLOCKED
      await prisma.friendship.update({
        where: { id: existingFriendship.id },
        data: {
          status: "BLOCKED",
          requesterId: session.user.id, // Blocker is the requester
          receiverId: targetUserId,
        },
      });
    } else {
      // Create new blocked relationship
      await prisma.friendship.create({
        data: {
          requesterId: session.user.id,
          receiverId: targetUserId,
          status: "BLOCKED",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error blocking user:", error);
    return NextResponse.json(
      { error: "Failed to block user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/block - Unblock a user
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Find the blocked relationship
    const blocked = await prisma.friendship.findFirst({
      where: {
        requesterId: session.user.id,
        receiverId: targetUserId,
        status: "BLOCKED",
      },
    });

    if (!blocked) {
      return NextResponse.json({ error: "User is not blocked" }, { status: 404 });
    }

    // Delete the blocked relationship
    await prisma.friendship.delete({
      where: { id: blocked.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unblocking user:", error);
    return NextResponse.json(
      { error: "Failed to unblock user" },
      { status: 500 }
    );
  }
}
