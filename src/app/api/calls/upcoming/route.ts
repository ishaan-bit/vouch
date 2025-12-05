import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/calls/upcoming - Get upcoming calls for the user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get groups where user is a member
    const memberships = await prisma.groupMembership.findMany({
      where: { userId: session.user.id },
      select: { groupId: true },
    });

    const groupIds = memberships.map((m: { groupId: string }) => m.groupId);

    // Find upcoming/scheduled calls for these groups
    const calls = await prisma.callSession.findMany({
      where: {
        groupId: { in: groupIds },
        status: { in: ["SCHEDULED", "ONGOING"] },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            endDate: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    return NextResponse.json(calls);
  } catch (error) {
    console.error("Error fetching upcoming calls:", error);
    return NextResponse.json(
      { error: "Failed to fetch upcoming calls" },
      { status: 500 }
    );
  }
}
