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

    // Count unread messages from multiple sources
    
    // 1. Get all groups user is a member of
    const memberships = await prisma.groupMembership.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);

    // 2. Get all DM threads user is part of
    const dmThreads = await prisma.dmThread.findMany({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId },
        ],
      },
      select: { id: true },
    });
    const dmThreadIds = dmThreads.map((t) => t.id);

    // For now, count messages from last 24 hours not from user as a proxy
    // A proper implementation would track lastReadAt per thread/group
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Count group messages
    const groupMessagesCount = await prisma.chatMessage.count({
      where: {
        groupId: { in: groupIds },
        senderId: { not: userId },
        createdAt: { gt: oneDayAgo },
      },
    });

    // Count DM messages
    const dmMessagesCount = await prisma.chatMessage.count({
      where: {
        dmThreadId: { in: dmThreadIds },
        senderId: { not: userId },
        createdAt: { gt: oneDayAgo },
      },
    });

    const totalMessages = groupMessagesCount + dmMessagesCount;

    return NextResponse.json({
      activity: activityCount,
      messages: Math.min(totalMessages, 99), // Cap at 99 for display
    });
  } catch (error) {
    console.error("Error fetching unread counts:", error);
    return NextResponse.json({ activity: 0, messages: 0 });
  }
}
