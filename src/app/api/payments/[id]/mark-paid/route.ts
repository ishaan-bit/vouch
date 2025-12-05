import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/payments/[id]/mark-paid - Mark a payment as paid by payer
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const obligation = await prisma.paymentObligation.findUnique({
      where: { id },
    });

    if (!obligation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only the payer can mark as paid
    if (obligation.fromUserId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (obligation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Payment already processed" },
        { status: 400 }
      );
    }

    await prisma.paymentObligation.update({
      where: { id },
      data: { status: "MARKED_PAID" },
    });

    // Notify the payee
    const payer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    await prisma.notification.create({
      data: {
        userId: obligation.toUserId,
        type: "PAYMENT_RECEIVED",
        title: "Payment marked as sent",
        message: `${payer?.name || "Someone"} marked a payment of ₹${obligation.amount / 100} as sent`,
        data: { obligationId: id },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking payment:", error);
    return NextResponse.json(
      { error: "Failed to mark payment" },
      { status: 500 }
    );
  }
}
