import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/friends/request - Send a friend request
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId } = body;

    if (!receiverId) {
      return NextResponse.json({ error: "Receiver ID required" }, { status: 400 });
    }

    if (receiverId === session.user.id) {
      return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });
    }

    // Check if friendship already exists
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: session.user.id, receiverId },
          { requesterId: receiverId, receiverId: session.user.id },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Friendship already exists or pending" },
        { status: 400 }
      );
    }

    // Create friendship
    const friendship = await prisma.friendship.create({
      data: {
        requesterId: session.user.id,
        receiverId,
        status: "PENDING",
      },
    });

    // Create notification for receiver
    const requester = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: "FRIEND_REQUEST",
        title: "New friend request",
        message: `${requester?.name || "Someone"} wants to be your friend`,
        data: { friendshipId: friendship.id, requesterId: session.user.id },
      },
    });

    return NextResponse.json(friendship, { status: 201 });
  } catch (error) {
    console.error("Error creating friend request:", error);
    return NextResponse.json(
      { error: "Failed to send request" },
      { status: 500 }
    );
  }
}
