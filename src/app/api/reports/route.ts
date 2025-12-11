import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

export interface ReportData {
  type: "USER" | "MESSAGE" | "PROOF" | "GROUP";
  targetId: string;
  reason: string;
  details?: string;
}

// POST /api/reports - Create a new report
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ReportData = await request.json();
    const { type, targetId, reason, details } = body;

    if (!type || !targetId || !reason) {
      return NextResponse.json(
        { error: "type, targetId, and reason are required" },
        { status: 400 }
      );
    }

    // Validate report type
    const validTypes = ["USER", "MESSAGE", "PROOF", "GROUP"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 }
      );
    }

    // Check if user has already reported this target
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: session.user.id,
        type,
        targetId,
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "You have already reported this" },
        { status: 400 }
      );
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        reporterId: session.user.id,
        type,
        targetId,
        reason,
        details,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, reportId: report.id }, { status: 201 });
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }
}

// GET /api/reports - Get reports (admin only, future use)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For now, just return user's own reports
    const reports = await prisma.report.findMany({
      where: {
        reporterId: session.user.id,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
