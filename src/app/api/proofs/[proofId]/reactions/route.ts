import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ proofId: string }>;
}

// GET /api/proofs/[proofId]/reactions - Get reactions for a proof
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proofId } = await params;

    const reactions = await prisma.proofReaction.findMany({
      where: { proofId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json(reactions);
  } catch (error) {
    console.error("Error fetching reactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch reactions" },
      { status: 500 }
    );
  }
}

// POST /api/proofs/[proofId]/reactions - Add/toggle a reaction
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proofId } = await params;
    const { emoji } = await request.json();

    if (!emoji) {
      return NextResponse.json(
        { error: "emoji is required" },
        { status: 400 }
      );
    }

    // Validate emoji - allow common reactions
    const validEmojis = ["🔥", "👏", "💀", "👍", "👎", "❤️", "😂", "😮", "😢", "😡"];
    if (!validEmojis.includes(emoji)) {
      return NextResponse.json(
        { error: "Invalid emoji" },
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

    // Toggle reaction (delete if exists, create if not)
    const existingReaction = await prisma.proofReaction.findFirst({
      where: {
        proofId,
        userId: session.user.id,
        emoji,
      },
    });

    if (existingReaction) {
      // Remove reaction
      await prisma.proofReaction.delete({
        where: { id: existingReaction.id },
      });
      return NextResponse.json({ action: "removed", emoji });
    } else {
      // Add reaction
      const reaction = await prisma.proofReaction.create({
        data: {
          proofId,
          userId: session.user.id,
          emoji,
        },
      });
      return NextResponse.json({ action: "added", reaction }, { status: 201 });
    }
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return NextResponse.json(
      { error: "Failed to toggle reaction" },
      { status: 500 }
    );
  }
}
