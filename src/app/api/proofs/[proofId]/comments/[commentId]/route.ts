import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ proofId: string; commentId: string }>;
}

// DELETE /api/proofs/[proofId]/comments/[commentId] - Delete a comment (author only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proofId, commentId } = await params;

    const comment = await prisma.proofComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.proofId !== proofId) {
      return NextResponse.json({ error: "Comment does not belong to this proof" }, { status: 400 });
    }

    // Only author can delete their comment
    if (comment.authorId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the comment author can delete it" },
        { status: 403 }
      );
    }

    await prisma.proofComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
