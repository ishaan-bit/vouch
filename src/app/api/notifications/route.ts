import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/notifications - List user's notifications
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[NOTIFICATIONS] Fetching notifications for user ${session.user.id}`);

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    console.log(`[NOTIFICATIONS] Found ${notifications.length} notifications`);
    console.log(`[NOTIFICATIONS] Types:`, notifications.map(n => n.type).join(', '));

    // Enhance notifications with current status for actionable items
    const enhancedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        // For friend requests, check if the friendship is still pending
        if (notification.type === "FRIEND_REQUEST" && notification.data) {
          const friendshipId = (notification.data as { friendshipId?: string }).friendshipId;
          if (friendshipId) {
            const friendship = await prisma.friendship.findUnique({
              where: { id: friendshipId },
              select: { status: true },
            });
            return {
              ...notification,
              data: {
                ...notification.data as object,
                friendshipStatus: friendship?.status || "DELETED",
              },
            };
          }
        }
        
        // For join requests, check if the request is still pending
        if (notification.type === "JOIN_REQUEST" && notification.data) {
          const joinRequestId = (notification.data as { joinRequestId?: string }).joinRequestId;
          if (joinRequestId) {
            const joinRequest = await prisma.joinRequest.findUnique({
              where: { id: joinRequestId },
              select: { status: true },
            });
            return {
              ...notification,
              data: {
                ...notification.data as object,
                joinRequestStatus: joinRequest?.status || "DELETED",
              },
            };
          }
        }
        
        return notification;
      })
    );

    return NextResponse.json(enhancedNotifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
