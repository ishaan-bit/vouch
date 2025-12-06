import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ threadId: string }>;
}

// GET /api/messages/dm/[threadId] - Get messages in a DM thread
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await params;
    
    if (!threadId) {
      return NextResponse.json({ error: "Thread ID required" }, { status: 400 });
    }

    // Check if user is part of the thread
    const thread = await prisma.dmThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.userAId !== session.user.id && thread.userBId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Fetch messages - simple query without cursor for now
    const messages = await prisma.chatMessage.findMany({
      where: { dmThreadId: threadId },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({
      messages,
      nextCursor: null,
    });
  } catch (error) {
    console.error("Error fetching DM messages:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch messages", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/messages/dm/[threadId] - Send a message to an existing thread
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await params;
    const body = await request.json();
    const { content, mediaUrl, mediaType } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: "Message content or media required" }, { status: 400 });
    }

    // Check if user is part of the thread
    const thread = await prisma.dmThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.userAId !== session.user.id && thread.userBId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        dmThreadId: threadId,
        senderId: session.user.id,
        type: mediaUrl ? "MEDIA" : "TEXT",
        content: content || "",
        mediaUrl: mediaUrl || null,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({
      ...message,
      mediaType: mediaType || (mediaUrl ? "IMAGE" : null),
    }, { status: 201 });
  } catch (error) {
    console.error("Error sending DM message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
