import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ messageId: string }>;
}

// DELETE /api/messages/[messageId] - Delete a message (only sender can delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId } = await params;
    if (!messageId) {
      return NextResponse.json({ error: "Message ID required" }, { status: 400 });
    }

    console.log("[DELETE MESSAGE] User:", session.user.id, "Message:", messageId);

    // Find the message
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        dmThreadId: true,
        groupId: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Only the sender can delete their own message
    if (message.senderId !== session.user.id) {
      console.log("[DELETE MESSAGE] Forbidden - not sender. Sender:", message.senderId, "User:", session.user.id);
      return NextResponse.json(
        { error: "You can only delete your own messages" },
        { status: 403 }
      );
    }

    // Delete the message
    await prisma.chatMessage.delete({
      where: { id: messageId },
    });

    console.log("[DELETE MESSAGE] Success - deleted message:", messageId);

    return NextResponse.json({ 
      success: true, 
      message: "Message deleted" 
    });
  } catch (error) {
    console.error("[DELETE MESSAGE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
