import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ username: string }>;
}

// GET /api/users/[username] - Get user profile by username or ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { username } = await params;

    // Try to find user by username first, then by ID
    let user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        profileStats: {
          select: {
            groupsCompleted: true,
            trustScore: true,
            rulesCreatedCount: true,
            rulesCompletedCount: true,
          },
        },
        proofs: {
          where: { isPublic: true },
          select: {
            id: true,
            caption: true,
            mediaType: true,
            mediaUrl: true,
            createdAt: true,
            group: {
              select: { id: true, name: true },
            },
            ruleLinks: {
              include: {
                rule: { select: { description: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    // If not found by username, try by ID (for users without usernames)
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: username },
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          bio: true,
          createdAt: true,
          profileStats: {
            select: {
              groupsCompleted: true,
              trustScore: true,
              rulesCreatedCount: true,
              rulesCompletedCount: true,
            },
          },
          proofs: {
            where: { isPublic: true },
            select: {
              id: true,
              caption: true,
              mediaType: true,
              mediaUrl: true,
              createdAt: true,
              group: {
                select: { id: true, name: true },
              },
              ruleLinks: {
                include: {
                  rule: { select: { description: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure proofs array exists (defensive)
    if (!user.proofs) {
      user = { ...user, proofs: [] };
    }

    // Determine friendship status
    let friendshipStatus: "none" | "pending-sent" | "pending-received" | "friends" = "none";
    let friendshipId: string | undefined;

    if (session?.user?.id && session.user.id !== user.id) {
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: session.user.id, receiverId: user.id },
            { requesterId: user.id, receiverId: session.user.id },
          ],
        },
      });

      if (friendship) {
        friendshipId = friendship.id;
        if (friendship.status === "ACCEPTED") {
          friendshipStatus = "friends";
        } else if (friendship.status === "PENDING") {
          if (friendship.requesterId === session.user.id) {
            friendshipStatus = "pending-sent";
          } else {
            friendshipStatus = "pending-received";
          }
        }
      }

      // Count mutual friends
      const mutualFriends = await prisma.friendship.count({
        where: {
          status: "ACCEPTED",
          AND: [
            {
              OR: [
                { requesterId: session.user.id },
                { receiverId: session.user.id },
              ],
            },
            {
              OR: [
                { requesterId: user.id },
                { receiverId: user.id },
              ],
            },
          ],
        },
      });

      return NextResponse.json({
        ...user,
        friendshipStatus,
        friendshipId,
        mutualFriends,
      });
    }

    return NextResponse.json({
      ...user,
      friendshipStatus: "none",
      mutualFriends: 0,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
