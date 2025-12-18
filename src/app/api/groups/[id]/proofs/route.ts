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
    console.log("[GET proofs] Session user:", session?.user?.id);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const { searchParams } = new URL(request.url);
    const storiesOnly = searchParams.get("stories") === "true";
    const dayIndex = searchParams.get("day");
    
    console.log("[GET proofs] GroupId:", groupId, "DayIndex:", dayIndex, "StoriesOnly:", storiesOnly);

    // For stories query, just return empty array - stories feature disabled
    if (storiesOnly) {
      return NextResponse.json([]);
    }

    // Check if group exists first
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });

    if (!group) {
      // Group doesn't exist - return empty instead of error
      return NextResponse.json([]);
    }

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
      // Not a member - return empty instead of 403 to prevent console errors
      return NextResponse.json([]);
    }

    // Base filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { groupId };
    if (dayIndex) {
      whereClause.dayIndex = parseInt(dayIndex);
    }
    
    console.log("[GET proofs] Where clause:", JSON.stringify(whereClause));

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
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("[GET proofs] Found proofs:", proofs.length);
    return NextResponse.json(proofs);
  } catch (error) {
    console.error("[GET proofs] Error:", error);
    // Return empty array instead of 500 to prevent console spam
    return NextResponse.json([]);
  }
}

// POST /api/groups/[id]/proofs - Create a proof
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    console.log("[POST proofs] Session user:", session?.user?.id);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const body = await request.json();
    console.log("[POST proofs] Request body:", JSON.stringify(body));

    // Validate
    const result = createProofSchema.safeParse({ ...body, groupId });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const errorMessages = Object.entries(fieldErrors)
        .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
        .join("; ");
      console.log("[POST proofs] Validation failed:", errorMessages);
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
      console.log("[POST proofs] Not a member of group:", groupId);
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
      console.log("[POST proofs] Group not active:", group?.status);
      return NextResponse.json(
        { error: "Group is not active" },
        { status: 400 }
      );
    }

    const { dayIndex, caption, mediaType, mediaUrl, textContent, ruleIds, isPublic, isStory } =
      result.data;

    console.log("[POST proofs] Creating proof with ruleIds:", ruleIds);

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

    console.log("[POST proofs] Created proof:", proof.id);

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
