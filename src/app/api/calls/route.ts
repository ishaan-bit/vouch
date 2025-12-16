import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/calls - Create a new call session for a group
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await request.json();

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 }
      );
    }

    // Check if user is a member of the group
    const membership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this group" },
        { status: 403 }
      );
    }

    // Check if there's already an active call
    const activeCall = await prisma.callSession.findFirst({
      where: {
        groupId,
        status: { in: ["SCHEDULED", "RINGING", "LIVE", "ONGOING"] },
      },
    });

    if (activeCall) {
      return NextResponse.json(
        { error: "There's already an active call", callId: activeCall.id, status: activeCall.status },
        { status: 400 }
      );
    }

    // Create the call session with RINGING status (call is starting)
    const call = await prisma.callSession.create({
      data: {
        groupId,
        status: "RINGING",
        scheduledAt: new Date(),
        startedAt: new Date(),
      },
    });

    // Notify all group members
    const members = await prisma.groupMembership.findMany({
      where: { groupId },
      select: { userId: true },
    });

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    await prisma.notification.createMany({
      data: members
        .filter((m: { userId: string }) => m.userId !== session.user.id)
        .map((m: { userId: string }) => ({
          userId: m.userId,
          type: "CALL_STARTED" as const,
          title: "📞 Group call starting!",
          message: `${session.user.name || "Someone"} started a call in "${group?.name || "your group"}". Join now!`,
          data: { callId: call.id, groupId },
        })),
    });

    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    console.error("Error creating call:", error);
    return NextResponse.json(
      { error: "Failed to create call" },
      { status: 500 }
    );
  }
}

// GET /api/calls?groupId=xxx - Get active call for a group
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 }
      );
    }

    // First try to find an active call (in any active state)
    let call = await prisma.callSession.findFirst({
      where: {
        groupId,
        status: { in: ["SCHEDULED", "RINGING", "LIVE", "ONGOING"] },
      },
      include: {
        votes: {
          include: {
            voter: {
              select: { id: true, name: true, avatarUrl: true },
            },
            rule: {
              select: { id: true, title: true, creatorId: true },
            },
          },
        },
      },
    });

    // If no active call, check if there's a completed call (prevent restarting)
    if (!call) {
      call = await prisma.callSession.findFirst({
        where: {
          groupId,
          status: "COMPLETED",
        },
        orderBy: { endedAt: "desc" },
        include: {
          votes: {
            include: {
              voter: {
                select: { id: true, name: true, avatarUrl: true },
              },
              rule: {
                select: { id: true, title: true, creatorId: true },
              },
            },
          },
        },
      });
    }

    return NextResponse.json(call);
  } catch (error) {
    console.error("Error fetching call:", error);
    return NextResponse.json(
      { error: "Failed to fetch call" },
      { status: 500 }
    );
  }
}
