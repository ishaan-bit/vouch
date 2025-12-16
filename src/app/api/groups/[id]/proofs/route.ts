import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { createProofSchema } from "@/lib/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/groups/[id]/proofs - Get proofs for a group
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    // Verify user is a member of this group
    const membership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dayIndex = searchParams.get("day");
    const storiesOnly = searchParams.get("stories") === "true";

    // Base filter
    const whereClause: Record<string, unknown> = { groupId };
    if (dayIndex) {
      whereClause.dayIndex = parseInt(dayIndex);
    }

    // For stories, filter to only active (non-expired) stories
    if (storiesOnly) {
      whereClause.isStory = true;
      whereClause.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ];
    } else {
      // For regular proofs, exclude expired stories
      whereClause.OR = [
        { isStory: false },
        { isStory: true, expiresAt: { gt: new Date() } }
      ];
    }

    const proofs = await prisma.proof.findMany({
      where: whereClause,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(proofs);
  } catch (error) {
    console.error("Error fetching proofs:", error);
    return NextResponse.json(
      { error: "Failed to fetch proofs" },
      { status: 500 }
    );
  }
}

// POST /api/groups/[id]/proofs - Create a proof
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const body = await request.json();

    // Validate
    const result = createProofSchema.safeParse({ ...body, groupId });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const errorMessages = Object.entries(fieldErrors)
        .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
        .join("; ");
      return NextResponse.json(
        { error: errorMessages || "Invalid input" },
        { status: 400 }
      );
    }

    // Check user is a member
    const membership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Check group is active
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          select: { userId: true },
        },
      },
    });

    if (group?.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Group is not active" },
        { status: 400 }
      );
    }

    const { dayIndex, caption, mediaType, mediaUrl, textContent, ruleIds, isPublic, isStory } =
      result.data;

    // Calculate expiresAt for stories (24h from now)
    const expiresAt = isStory ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    // Create proof with rule links
    const proof = await prisma.proof.create({
      data: {
        groupId,
        uploaderId: session.user.id,
        dayIndex,
        caption,
        mediaType,
        mediaUrl,
        textContent,
        isPublic,
        isStory,
        expiresAt,
        ruleLinks: {
          create: ruleIds.map((ruleId) => ({
            ruleId,
          })),
        },
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        ruleLinks: {
          include: {
            rule: true,
          },
        },
      },
    });

    // Notify other group members about the new proof (P1 fix H)
    if (group) {
      const otherMemberIds = group.memberships
        .map(m => m.userId)
        .filter(id => id !== session.user.id);

      if (otherMemberIds.length > 0) {
        await prisma.notification.createMany({
          data: otherMemberIds.map(memberId => ({
            userId: memberId,
            type: "PROOF_UPLOADED" as const,
            title: "New proof uploaded! 📸",
            message: `${session.user.name || "A member"} uploaded a proof in "${group.name}"`,
            data: {
              groupId,
              groupName: group.name,
              proofId: proof.id,
              uploaderId: session.user.id,
              uploaderName: session.user.name,
              mediaType,
            },
          })),
        });
      }
    }

    return NextResponse.json(proof, { status: 201 });
  } catch (error) {
    console.error("Error creating proof:", error);
    return NextResponse.json(
      { error: "Failed to create proof" },
      { status: 500 }
    );
  }
}
