import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/cause-losses - Get current user's cause losses
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const causeLosses = await prisma.causeLoss.findMany({
      where: { userId: session.user.id },
      include: {
        group: {
          select: { id: true, name: true },
        },
        rule: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(causeLosses);
  } catch (error) {
    console.error("Error fetching cause losses:", error);
    return NextResponse.json(
      { error: "Failed to fetch cause losses" },
      { status: 500 }
    );
  }
}

// POST /api/cause-losses - Create a new cause loss (triggered when user fails their own rule)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { groupId, ruleId, amount, cycleId } = body;

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Create cause loss entry
    const causeLoss = await prisma.causeLoss.create({
      data: {
        userId: session.user.id,
        groupId: groupId || null,
        ruleId: ruleId || null,
        cycleId: cycleId || null,
        amount,
        status: "PLEDGED",
      },
    });

    // Create notification to prompt user about donation
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "CAUSE_LOSS_PROMPT",
        title: "Vouch for a Cause",
        message: `You lost ₹${amount / 100} on your own rule. Consider donating this amount to a cause that matters to you.`,
        data: JSON.stringify({ causeLossId: causeLoss.id, amount }),
      },
    });

    return NextResponse.json(causeLoss, { status: 201 });
  } catch (error) {
    console.error("Error creating cause loss:", error);
    return NextResponse.json(
      { error: "Failed to create cause loss" },
      { status: 500 }
    );
  }
}
