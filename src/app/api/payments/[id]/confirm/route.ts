import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/payments/[id]/confirm - Payee confirms receiving payment
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

    // Only the payee can confirm receipt
    if (obligation.toUserId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (obligation.status !== "MARKED_PAID") {
      return NextResponse.json(
        { error: "Payment must be marked as paid first" },
        { status: 400 }
      );
    }

    await prisma.paymentObligation.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        settledAt: new Date(),
      },
    });

    // Update profile stats for both users
    const payee = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    await prisma.notification.create({
      data: {
        userId: obligation.fromUserId,
        type: "PAYMENT_RECEIVED",
        title: "Payment confirmed",
        message: `${payee?.name || "Someone"} confirmed receiving your payment of ₹${obligation.amount / 100}`,
        data: { obligationId: id },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
