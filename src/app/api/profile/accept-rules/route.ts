import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/profile/accept-rules - Accept the Rules of Vouch Club
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { hasAcceptedVouchRules: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error accepting rules:", error);
    return NextResponse.json(
      { error: "Failed to accept rules" },
      { status: 500 }
    );
  }
}
