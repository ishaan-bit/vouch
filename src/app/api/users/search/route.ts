import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/users/search - Search users
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: session.user.id } },
          {
            OR: [
              { name: { contains: query } },
              { username: { contains: query } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        profileStats: {
          select: {
            trustScore: true,
            groupsCompleted: true,
          },
        },
      },
      take: 20,
    });

    // Get friendship status for each user
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: session.user.id, receiverId: { in: users.map((u: { id: string }) => u.id) } },
          { receiverId: session.user.id, requesterId: { in: users.map((u: { id: string }) => u.id) } },
        ],
      },
    });

    const usersWithStatus = users.map((user: { id: string }) => {
      const friendship = friendships.find(
        (f: { requesterId: string; receiverId: string }) =>
          (f.requesterId === session.user.id && f.receiverId === user.id) ||
          (f.receiverId === session.user.id && f.requesterId === user.id)
      );

      return {
        ...user,
        isFriend: friendship?.status === "ACCEPTED",
        hasPendingRequest: friendship?.status === "PENDING",
      };
    });

    return NextResponse.json(usersWithStatus);
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
