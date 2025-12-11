import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// Message types supported in DMs
type DmMessageType = "TEXT" | "MEDIA";

// POST /api/messages/dm - Start a DM thread or send a direct message
// Supports text, image, video, and audio messages
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recipientId, userId, content, mediaUrl, mediaType } = body;
    
    // Support both "recipientId" and "userId" for creating threads
    const targetUserId = recipientId || userId;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "recipientId or userId is required" },
        { status: 400 }
      );
    }

    // Check if they're friends
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: session.user.id, receiverId: targetUserId },
          { requesterId: targetUserId, receiverId: session.user.id },
        ],
      },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "You can only message friends" },
        { status: 403 }
      );
    }

    // Find or create DM thread
    let thread = await prisma.dmThread.findFirst({
      where: {
        OR: [
          { userAId: session.user.id, userBId: targetUserId },
          { userAId: targetUserId, userBId: session.user.id },
        ],
      },
    });

    if (!thread) {
      thread = await prisma.dmThread.create({
        data: {
          userAId: session.user.id,
          userBId: targetUserId,
        },
      });
    }

    // If content or mediaUrl is provided, create a message
    if (content || mediaUrl) {
      // Determine message type
      const msgType: DmMessageType = mediaUrl ? "MEDIA" : "TEXT";
      
      const message = await prisma.chatMessage.create({
        data: {
          dmThreadId: thread.id,
          senderId: session.user.id,
          type: msgType,
          content: content || "", // For media messages, content can be caption
          mediaUrl: mediaUrl || null,
        },
        include: {
          sender: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      // Create notification for the recipient
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: "OTHER",
          title: "New message",
          message: `${session.user.name || "Someone"} sent you a message`,
          data: { threadId: thread.id, senderId: session.user.id },
        },
      });

      // Add mediaType to response for frontend to know how to render
      const response = {
        ...message,
        mediaType: mediaType || (mediaUrl ? "IMAGE" : null), // Default to IMAGE if mediaUrl present
      };

      return NextResponse.json(response, { status: 201 });
    }

    // If no content, just return the thread
    return NextResponse.json(thread, { status: 200 });
  } catch (error) {
    console.error("Error sending DM:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

// GET /api/messages/dm - Get all DM threads
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Simple query first
    let threads;
    try {
      threads = await prisma.dmThread.findMany({
        where: {
          OR: [
            { userAId: session.user.id },
            { userBId: session.user.id },
          ],
        },
        include: {
          userA: {
            select: { id: true, name: true, username: true, avatarUrl: true },
          },
          userB: {
            select: { id: true, name: true, username: true, avatarUrl: true },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: {
              content: true,
              createdAt: true,
              sender: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });
    } catch (dbError) {
      console.error("DB error fetching threads:", dbError);
      return NextResponse.json({ 
        error: "Database error", 
        details: dbError instanceof Error ? dbError.message : "Unknown" 
      }, { status: 500 });
    }

    // Transform and sort by most recent message
    // First, get all friendship IDs for these users
    const otherUserIds = threads.map((thread: any) =>
      thread.userAId === session.user.id ? thread.userBId : thread.userAId
    );
    
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: session.user.id, receiverId: { in: otherUserIds } },
          { requesterId: { in: otherUserIds }, receiverId: session.user.id },
        ],
        status: "ACCEPTED",
      },
      select: {
        id: true,
        requesterId: true,
        receiverId: true,
      },
    });
    
    const friendshipMap = new Map();
    friendships.forEach((f: any) => {
      const otherId = f.requesterId === session.user.id ? f.receiverId : f.requesterId;
      friendshipMap.set(otherId, f.id);
    });

    const transformed = threads.map((thread: any) => {
      const otherUser =
        thread.userAId === session.user.id ? thread.userB : thread.userA;
      return {
        id: thread.id,
        otherUser,
        friendshipId: friendshipMap.get(otherUser.id) || null,
        lastMessage: thread.messages[0] || null,
        unreadCount: 0, // TODO: implement unread count
        updatedAt: thread.messages[0]?.createdAt || thread.createdAt,
      };
    });

    // Sort by most recent message (newest first)
    transformed.sort((a: any, b: any) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching DM threads:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
