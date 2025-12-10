import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { buildUpiUri } from "@/lib/upi";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/payments/[id]/upi-link - Get UPI payment link for an obligation
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const obligation = await prisma.paymentObligation.findUnique({
      where: { id },
      include: {
        toUser: {
          select: {
            name: true,
            upiId: true,
          },
        },
        rule: {
          select: {
            title: true,
          },
        },
        group: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!obligation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only the payer can get the payment link
    if (obligation.fromUserId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (!obligation.toUser.upiId) {
      return NextResponse.json(
        { error: "Payee has not set up UPI ID" },
        { status: 400 }
      );
    }

    if (obligation.status !== "PENDING" && obligation.status !== "MARKED_PAID") {
      return NextResponse.json(
        { error: "Payment already confirmed" },
        { status: 400 }
      );
    }

    const upiLink = buildUpiUri({
      payeeVpa: obligation.toUser.upiId,
      payeeName: obligation.toUser.name || "Vouch User",
      amountInRupees: obligation.amount / 100,
      txnNote: `Vouch: ${obligation.group.name}${obligation.rule.title ? ` - ${obligation.rule.title}` : ""}`,
    });

    return NextResponse.json({
      upiLink,
      payee: obligation.toUser.name,
      amount: obligation.amount / 100,
      rule: obligation.rule.title,
      group: obligation.group.name,
    });
  } catch (error) {
    console.error("Error getting UPI link:", error);
    return NextResponse.json(
      { error: "Failed to get UPI link" },
      { status: 500 }
    );
  }
}
