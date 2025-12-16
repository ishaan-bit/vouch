import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ username: string }>;
}

// Canonical profile route: /profile/[username]
// API: /api/users/[username] - accepts username or user ID
// GET /api/users/[username] - Get user profile by username or ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { username } = await params;

    // Validate username param - reject null, undefined, empty, or literal "null" string
    if (!username || username === "null" || username === "undefined" || username.trim() === "") {
      return NextResponse.json(
        { error: "Invalid username or ID" },
        { status: 400 }
      );
    }

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
            groupsStarted: true,
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
            textContent: true,
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
          take: 50,
        },
        // Fetch group memberships and created rules for stats
        groupMemberships: {
          select: {
            id: true,
            group: {
              select: {
                id: true,
                name: true,
                description: true,
                status: true,
                createdAt: true,
                durationDays: true,
                _count: {
                  select: {
                    memberships: true,
                  },
                },
              },
            },
          },
          orderBy: {
            joinedAt: "desc",
          },
        },
        createdRules: {
          select: { id: true },
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
              groupsStarted: true,
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
              textContent: true,
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
            take: 50,
          },
          // Fetch group memberships and created rules for stats
          groupMemberships: {
            select: {
              id: true,
              group: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  status: true,
                  createdAt: true,
                  durationDays: true,
                  _count: {
                    select: {
                      memberships: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              joinedAt: "desc",
            },
          },
          createdRules: {
            select: { id: true },
          },
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Cast to any to handle TypeScript's inability to infer union types after conditional assignment
    const userData = user as any;

    // Ensure proofs array exists (defensive)
    const proofs = userData.proofs || [];
    
    // Extract groups from memberships
    const groups = (userData.groupMemberships || []).map((membership: any) => ({
      id: membership.group.id,
      name: membership.group.name,
      description: membership.group.description,
      status: membership.group.status,
      durationDays: membership.group.durationDays,
      memberCount: membership.group._count?.memberships || 0,
    }));
    
    // Calculate profile stats for frontend
    const totalGroups = userData.groupMemberships?.length || 0;
    const totalRules = userData.createdRules?.length || 0;
    const totalProofs = proofs.length;
    
    // Calculate success rate from profileStats if available
    const stats = userData.profileStats;
    const groupsStarted = stats?.groupsStarted || 0;
    const groupsCompleted = stats?.groupsCompleted || 0;
    const successRate = groupsStarted > 0 
      ? Math.round((groupsCompleted / groupsStarted) * 100) 
      : 0;
    
    // Build the computed profile stats object the frontend expects
    const computedProfileStats = {
      totalGroups,
      totalRules,
      totalProofs,
      successRate,
      // Also include raw stats for reference
      trustScore: stats?.trustScore || 50,
      groupsCompleted,
    };

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
        id: user.id,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
        profileStats: computedProfileStats,
        proofs,
        groups,
        friendshipStatus,
        friendshipId,
        mutualFriends,
      });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
      profileStats: computedProfileStats,
      proofs,
      groups,
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
