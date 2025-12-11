import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/notifications/live - Get new notifications since a timestamp
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 30000); // Default: last 30 seconds

    // Get new notifications since the timestamp
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gt: sinceDate },
        isRead: false,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Transform notifications into a consistent format
    const formattedNotifications = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message || n.title,
      data: n.data || {},
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({ notifications: formattedNotifications });
  } catch (error) {
    console.error("Error fetching live notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
