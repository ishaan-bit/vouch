import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/messages/groups - Get group chats for the user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get groups where user is a member
    const memberships = await prisma.groupMembership.findMany({
      where: { userId: session.user.id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            status: true,
            _count: {
              select: {
                memberships: true,
              },
            },
            memberships: {
              include: {
                user: {
                  select: {
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
              take: 4,
            },
            chatMessages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                sender: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    interface ChatMessage {
      content: string;
      sender: { name: string | null };
      createdAt: Date;
    }
    
    interface MembershipUser {
      user: { name: string | null; avatarUrl: string | null };
    }
    
    interface GroupWithDetails {
      group: {
        id: string;
        name: string;
        status: string;
        chatMessages: ChatMessage[];
        memberships: MembershipUser[];
        _count: { memberships: number };
      };
    }

    const groupChats = (memberships as GroupWithDetails[]).map((m) => ({
      id: m.group.id,
      name: m.group.name,
      status: m.group.status,
      memberCount: m.group._count.memberships,
      lastMessage: m.group.chatMessages[0]
        ? {
            content: m.group.chatMessages[0].content,
            senderName: m.group.chatMessages[0].sender.name || "Unknown",
            createdAt: m.group.chatMessages[0].createdAt,
          }
        : null,
      unreadCount: 0, // TODO: implement unread count
      memberAvatars: m.group.memberships
        .map((mem) => mem.user.avatarUrl)
        .filter((url): url is string => url !== null),
      memberNames: m.group.memberships
        .map((mem) => mem.user.name)
        .filter((name): name is string => name !== null),
      updatedAt: m.group.chatMessages[0]?.createdAt || new Date(0),
    }));

    // Sort by most recent message (newest first)
    groupChats.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json(groupChats);
  } catch (error) {
    console.error("Error fetching group chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch group chats" },
      { status: 500 }
    );
  }
}
