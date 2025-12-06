import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/users/suggested - Get suggested users to add as friends
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get IDs of existing friends and pending requests
    const existingConnections = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: session.user.id },
          { receiverId: session.user.id },
        ],
      },
      select: {
        requesterId: true,
        receiverId: true,
        status: true,
      },
    });

    const connectedUserIds = new Set(
      existingConnections.flatMap((c: { requesterId: string; receiverId: string }) => [c.requesterId, c.receiverId])
    );
    connectedUserIds.add(session.user.id);

    // Get users who are not already connected
    const suggestedUsers = await prisma.user.findMany({
      where: {
        id: { notIn: Array.from(connectedUserIds) },
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            groupMemberships: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Transform to expected format with defensive defaults
    const usersWithStatus = suggestedUsers.map((user: any) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      _count: {
        memberships: user._count?.groupMemberships ?? 0,
      },
      isFriend: false,
      hasPendingRequest: false,
    }));

    return NextResponse.json(usersWithStatus);
  } catch (error) {
    console.error("Error fetching suggested users:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
