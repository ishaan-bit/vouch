import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/groups/[id]/ready - Mark user as ready
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

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

    // Check group is in planning
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (group?.status !== "PLANNING") {
      return NextResponse.json(
        { error: "Group is not in planning phase" },
        { status: 400 }
      );
    }

    // Check user has created a rule
    const userRule = await prisma.rule.findFirst({
      where: {
        groupId,
        creatorId: session.user.id,
      },
    });

    if (!userRule) {
      return NextResponse.json(
        { error: "You must create a rule before marking ready" },
        { status: 400 }
      );
    }

    // Update membership
    const updated = await prisma.groupMembership.update({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
      data: { isReady: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error setting ready:", error);
    return NextResponse.json(
      { error: "Failed to set ready status" },
      { status: 500 }
    );
  }
}
