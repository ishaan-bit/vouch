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
    const { searchParams } = new URL(request.url);
    const cursorParam = searchParams.get("cursor");
    const cursor = cursorParam && cursorParam.length > 0 ? cursorParam : null;
    const limit = parseInt(searchParams.get("limit") || "50");

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

    // Build query options - avoid cursor if not provided
    const queryOptions: {
      where: { dmThreadId: string };
      take: number;
      skip?: number;
      cursor?: { id: string };
      orderBy: { createdAt: "desc" };
      include: { sender: { select: { id: boolean; name: boolean; avatarUrl: boolean } } };
    } = {
      where: { dmThreadId: threadId },
      take: limit,
      orderBy: { createdAt: "desc" as const },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    };

    if (cursor) {
      queryOptions.skip = 1;
      queryOptions.cursor = { id: cursor };
    }

    const messages = await prisma.chatMessage.findMany(queryOptions);

    return NextResponse.json({
      messages: messages.reverse(),
      nextCursor: messages.length === limit ? messages[messages.length - 1]?.id : null,
    });
  } catch (error) {
    console.error("Error fetching DM messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
