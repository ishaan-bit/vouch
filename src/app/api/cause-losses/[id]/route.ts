import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/cause-losses/[id] - Get a specific cause loss
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const causeLoss = await prisma.causeLoss.findUnique({
      where: { id },
      include: {
        group: {
          select: { id: true, name: true },
        },
        rule: {
          select: { id: true, title: true },
        },
      },
    });

    if (!causeLoss) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only owner can view their cause loss
    if (causeLoss.userId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    return NextResponse.json(causeLoss);
  } catch (error) {
    console.error("Error fetching cause loss:", error);
    return NextResponse.json(
      { error: "Failed to fetch cause loss" },
      { status: 500 }
    );
  }
}

// PATCH /api/cause-losses/[id] - Update a cause loss (log donation or skip)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, note, proofUrl } = body;

    // Validate status
    if (status && !["PLEDGED", "DONATED", "SKIPPED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Check ownership
    const existing = await prisma.causeLoss.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Update cause loss
    const updated = await prisma.causeLoss.update({
      where: { id },
      data: {
        status: status || existing.status,
        note: note !== undefined ? note : existing.note,
        proofUrl: proofUrl !== undefined ? proofUrl : existing.proofUrl,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating cause loss:", error);
    return NextResponse.json(
      { error: "Failed to update cause loss" },
      { status: 500 }
    );
  }
}
