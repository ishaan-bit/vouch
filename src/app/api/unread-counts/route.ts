import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/unread-counts - Get counts of unread notifications and messages
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ activity: 0, messages: 0 });
    }

    const userId = session.user.id;

    // Count unread notifications
    const activityCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    // Count unread messages (messages in chats where user is a participant)
    // First get all groups user is a member of
    const memberships = await prisma.groupMembership.findMany({
      where: { userId },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m) => m.groupId);

    // Count messages in those groups that are:
    // 1. Not from the current user
    // 2. Created after the user's last read (we'd need a lastRead field for this)
    // For now, we'll count messages from last 24 hours not from user as a simple proxy
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const messagesCount = await prisma.chatMessage.count({
      where: {
        groupId: { in: groupIds },
        senderId: { not: userId },
        createdAt: { gt: oneDayAgo },
      },
    });

    return NextResponse.json({
      activity: activityCount,
      messages: Math.min(messagesCount, 99), // Cap at 99 for display
    });
  } catch (error) {
    console.error("Error fetching unread counts:", error);
    return NextResponse.json({ activity: 0, messages: 0 });
  }
}
