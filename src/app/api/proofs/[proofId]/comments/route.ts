import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ proofId: string }>;
}

// GET /api/proofs/[proofId]/comments - Get comments for a proof
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proofId } = await params;

    // Check if proof exists and user has access
    const proof = await prisma.proof.findUnique({
      where: { id: proofId },
      include: {
        group: {
          include: {
            memberships: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!proof) {
      return NextResponse.json({ error: "Proof not found" }, { status: 404 });
    }

    // Check if user is a member of the group
    const isMember = proof.group.memberships.some(
      (m) => m.userId === session.user.id
    );
    if (!isMember) {
      return NextResponse.json(
        { error: "Not a member of this group" },
        { status: 403 }
      );
    }

    const comments = await prisma.proofComment.findMany({
      where: { proofId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/proofs/[proofId]/comments - Add a comment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proofId } = await params;
    const { content } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: "Comment too long (max 500 characters)" },
        { status: 400 }
      );
    }

    // Check if proof exists and user has access
    const proof = await prisma.proof.findUnique({
      where: { id: proofId },
      include: {
        group: {
          include: {
            memberships: {
              select: { userId: true },
            },
          },
        },
        uploader: {
          select: { id: true, name: true },
        },
      },
    });

    if (!proof) {
      return NextResponse.json({ error: "Proof not found" }, { status: 404 });
    }

    // Check if user is a member of the group
    const isMember = proof.group.memberships.some(
      (m) => m.userId === session.user.id
    );
    if (!isMember) {
      return NextResponse.json(
        { error: "Not a member of this group" },
        { status: 403 }
      );
    }

    // Create comment
    const comment = await prisma.proofComment.create({
      data: {
        proofId,
        authorId: session.user.id,
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            username: true,
          },
        },
      },
    });

    // Notify proof owner (if not self-commenting)
    if (proof.uploaderId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: proof.uploaderId,
          type: "PROOF_REACTION", // Reuse for comments too
          title: "New comment on your proof",
          message: `${session.user.name || "Someone"} commented: "${content.substring(0, 50)}${content.length > 50 ? "..." : ""}"`,
          data: {
            proofId,
            commentId: comment.id,
            commenterId: session.user.id,
            commenterName: session.user.name,
          },
        },
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
