import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/calls/[id] - Get call details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const call = await prisma.callSession.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            memberships: {
              include: {
                user: {
                  select: { id: true, name: true, username: true, avatarUrl: true },
                },
              },
            },
            rules: {
              where: { approved: true },
              include: {
                creator: {
                  select: { id: true, name: true, avatarUrl: true },
                },
              },
            },
          },
        },
        votes: {
          include: {
            voter: {
              select: { id: true, name: true, avatarUrl: true },
            },
            rule: true,
          },
        },
        obligations: {
          include: {
            fromUser: { select: { id: true, name: true, avatarUrl: true } },
            toUser: { select: { id: true, name: true, avatarUrl: true } },
            rule: { select: { title: true } },
          },
        },
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if user is a member
    const isMember = call.group.memberships.some(
      (m: { userId: string }) => m.userId === session.user.id
    );
    if (!isMember) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
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

// PATCH /api/calls/[id] - Update call status (start/end)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!["ONGOING", "COMPLETED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const call = await prisma.callSession.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            memberships: true,
          },
        },
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if user is a member
    const isMember = call.group.memberships.some(
      (m: { userId: string }) => m.userId === session.user.id
    );
    if (!isMember) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const updateData: { status: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED"; startedAt?: Date; endedAt?: Date } = {
      status: status as "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED",
    };

    if (status === "ONGOING" && !call.startedAt) {
      updateData.startedAt = new Date();
    }

    if (status === "COMPLETED" || status === "CANCELLED") {
      updateData.endedAt = new Date();
    }

    const updatedCall = await prisma.callSession.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedCall);
  } catch (error) {
    console.error("Error updating call:", error);
    return NextResponse.json(
      { error: "Failed to update call" },
      { status: 500 }
    );
  }
}
