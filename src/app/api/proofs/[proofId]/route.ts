import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ proofId: string }>;
}

// GET /api/proofs/[proofId] - Get a single proof
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proofId } = await params;

    const proof = await prisma.proof.findUnique({
      where: { id: proofId },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            memberships: {
              select: { userId: true },
            },
          },
        },
        ruleLinks: {
          include: {
            rule: {
              select: {
                id: true,
                description: true,
              },
            },
          },
        },
        reactions: true,
      },
    });

    if (!proof) {
      return NextResponse.json({ error: "Proof not found" }, { status: 404 });
    }

    // Check if user is a member of the group
    const isMember = proof.group.memberships.some((m) => m.userId === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    return NextResponse.json(proof);
  } catch (error) {
    console.error("Error fetching proof:", error);
    return NextResponse.json(
      { error: "Failed to fetch proof" },
      { status: 500 }
    );
  }
}

// DELETE /api/proofs/[proofId] - Delete a proof (owner only)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { proofId } = await params;

    // Find the proof
    const proof = await prisma.proof.findUnique({
      where: { id: proofId },
      select: {
        id: true,
        uploaderId: true,
        groupId: true,
      },
    });

    if (!proof) {
      return NextResponse.json({ error: "Proof not found" }, { status: 404 });
    }

    // Only the uploader can delete their proof
    if (proof.uploaderId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the proof uploader can delete it" },
        { status: 403 }
      );
    }

    // Delete the proof (cascades to ProofRuleLink and ProofReaction due to schema)
    await prisma.proof.delete({
      where: { id: proofId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting proof:", error);
    return NextResponse.json(
      { error: "Failed to delete proof" },
      { status: 500 }
    );
  }
}
