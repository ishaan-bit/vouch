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

    const threads = await prisma.dmThread.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    // Transform to show the other user
    const transformed = threads.map((thread: any) => {
      const otherUser =
        thread.userAId === session.user.id ? thread.userB : thread.userA;
      return {
        id: thread.id,
        otherUser,
        lastMessage: thread.messages[0] || null,
      };
    });

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching DM threads:", error);
    return NextResponse.json(
      { error: "Failed to fetch threads" },
      { status: 500 }
    );
  }
}
