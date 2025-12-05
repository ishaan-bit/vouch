import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { computePaymentObligations } from "@/lib/payouts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/calls/[id]/finalize - End voting and compute payment obligations
export async function POST(request: NextRequest, { params }: RouteParams) {
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
            memberships: true,
            rules: {
              where: { approved: true },
            },
          },
        },
        votes: true,
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

    if (call.status !== "ONGOING") {
      return NextResponse.json(
        { error: "Call must be ongoing to finalize" },
        { status: 400 }
      );
    }

    // Compute and create payment obligations
    const obligations = await computePaymentObligations(id);

    // Mark call as completed
    await prisma.callSession.update({
      where: { id },
      data: {
        status: "COMPLETED",
        endedAt: new Date(),
      },
    });

    // Mark group as completed
    await prisma.group.update({
      where: { id: call.groupId },
      data: { status: "COMPLETED" },
    });

    // Notify all members
    const members = call.group.memberships;
    await prisma.notification.createMany({
      data: members.map((m: { userId: string }) => ({
        userId: m.userId,
        type: "CYCLE_ENDED" as const,
        title: "Cycle completed!",
        message: `Voting finished for ${call.group.id}. Check your settlements.`,
        data: { callId: id, groupId: call.groupId },
      })),
    });

    return NextResponse.json({
      success: true,
      obligationsCreated: obligations.length,
      obligations,
    });
  } catch (error) {
    console.error("Error finalizing call:", error);
    return NextResponse.json(
      { error: "Failed to finalize call" },
      { status: 500 }
    );
  }
}
