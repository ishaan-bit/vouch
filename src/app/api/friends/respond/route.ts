import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/friends/respond - Accept or decline a friend request
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { friendshipId, accept } = body;

    if (!friendshipId || typeof accept !== "boolean") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        requester: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
    });

    if (!friendship) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only the receiver can respond
    if (friendship.receiverId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (friendship.status !== "PENDING") {
      return NextResponse.json({ error: "Request already handled" }, { status: 400 });
    }

    if (accept) {
      // Accept the request
      await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: "ACCEPTED" },
      });

      // Notify the requester
      await prisma.notification.create({
        data: {
          userId: friendship.requesterId,
          type: "FRIEND_ACCEPTED",
          title: "Friend request accepted",
          message: `${friendship.receiver.name || "Someone"} accepted your friend request`,
          data: { friendshipId },
        },
      });
    } else {
      // Decline - delete the request
      await prisma.friendship.delete({
        where: { id: friendshipId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error responding to friend request:", error);
    return NextResponse.json(
      { error: "Failed to respond" },
      { status: 500 }
    );
  }
}
