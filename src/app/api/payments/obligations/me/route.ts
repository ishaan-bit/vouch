import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserObligations } from "@/lib/payouts";

// GET /api/payments/obligations/me - Get current user's payment obligations
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId") || undefined;

    const obligations = await getUserObligations(session.user.id, groupId);

    return NextResponse.json(obligations);
  } catch (error) {
    console.error("Error fetching obligations:", error);
    return NextResponse.json(
      { error: "Failed to fetch obligations" },
      { status: 500 }
    );
  }
}
