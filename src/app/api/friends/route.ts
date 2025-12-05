import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/friends - List user's friends
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: session.user.id, status: "ACCEPTED" },
          { receiverId: session.user.id, status: "ACCEPTED" },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Extract the friend (the other person in the friendship)
    const friends = friendships.map((f: { requesterId: string; receiver: any; requester: any }) =>
      f.requesterId === session.user.id ? f.receiver : f.requester
    );

    return NextResponse.json(friends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 }
    );
  }
}
