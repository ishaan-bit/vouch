import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/calls/[id] - Get call details
export async function GET(request: NextRequest, { params }: RouteParams) {
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
            memberships: {
              include: {
                user: {
                  select: { id: true, name: true, username: true, avatarUrl: true },
                },
              },
            },
            rules: {
              where: { approved: true },
              include: {
                creator: {
                  select: { id: true, name: true, avatarUrl: true },
                },
              },
            },
          },
        },
        votes: {
          include: {
            voter: {
              select: { id: true, name: true, avatarUrl: true },
            },
            rule: true,
          },
        },
        obligations: {
          include: {
            fromUser: { select: { id: true, name: true, avatarUrl: true } },
            toUser: { select: { id: true, name: true, avatarUrl: true } },
            rule: { select: { title: true } },
          },
        },
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

    return NextResponse.json(call);
  } catch (error) {
    console.error("Error fetching call:", error);
    return NextResponse.json(
      { error: "Failed to fetch call" },
      { status: 500 }
    );
  }
}

// PATCH /api/calls/[id] - Update call status or meeting URL
// State machine: SCHEDULED -> RINGING -> LIVE -> ONGOING -> COMPLETED
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status, meetingUrl, skipCall } = await request.json();

    // Valid states
    const validStatuses = ["SCHEDULED", "RINGING", "LIVE", "ONGOING", "COMPLETED", "CANCELLED"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Validate meetingUrl if provided
    if (meetingUrl !== undefined && meetingUrl !== null && meetingUrl !== "") {
      try {
        const url = new URL(meetingUrl);
        // Allow common video call providers
        const allowedHosts = ["meet.google.com", "zoom.us", "teams.microsoft.com", "discord.gg", "discord.com"];
        const isAllowedHost = allowedHosts.some(host => url.host.includes(host) || url.host === host);
        if (!isAllowedHost && !meetingUrl.startsWith("https://")) {
          return NextResponse.json({ error: "Invalid meeting URL. Use Google Meet, Zoom, Teams, or Discord links." }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid meeting URL format" }, { status: 400 });
      }
    }

    const call = await prisma.callSession.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            memberships: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
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

    const updateData: { 
      status?: "SCHEDULED" | "RINGING" | "LIVE" | "ONGOING" | "COMPLETED" | "CANCELLED"; 
      startedAt?: Date; 
      endedAt?: Date;
      meetingUrl?: string | null;
    } = {};

    // Handle status update with state machine validation
    if (status) {
      const currentStatus = call.status;
      
      // Validate state transitions
      const validTransitions: Record<string, string[]> = {
        SCHEDULED: ["RINGING", "ONGOING", "CANCELLED"], // Can skip to ONGOING for "Skip call and vote"
        RINGING: ["LIVE", "ONGOING", "CANCELLED"],      // Can skip to ONGOING if call skipped
        LIVE: ["ONGOING", "CANCELLED"],                 // Call ends -> move to voting
        ONGOING: ["COMPLETED", "CANCELLED"],            // Voting ends
        COMPLETED: [],                                  // Terminal state
        CANCELLED: [],                                  // Terminal state
      };
      
      if (!validTransitions[currentStatus]?.includes(status)) {
        // Allow skipCall flag to force transition to ONGOING
        if (skipCall && status === "ONGOING" && ["SCHEDULED", "RINGING", "LIVE"].includes(currentStatus)) {
          console.log(`[CALL] Skip call flag used: ${currentStatus} -> ONGOING`);
        } else {
          return NextResponse.json({ 
            error: `Invalid state transition from ${currentStatus} to ${status}`,
            currentStatus,
            validTransitions: validTransitions[currentStatus],
          }, { status: 400 });
        }
      }
      
      updateData.status = status;
      
      // Set timestamps
      if (status === "RINGING" || status === "LIVE") {
        if (!call.startedAt) {
          updateData.startedAt = new Date();
        }
      }

      if (status === "COMPLETED" || status === "CANCELLED") {
        updateData.endedAt = new Date();
      }

      // Notify members on state changes
      if (status === "RINGING") {
        // Notify all members except initiator that call is starting
        const otherMembers = call.group.memberships.filter(
          (m: { userId: string }) => m.userId !== session.user.id
        );
        
        if (otherMembers.length > 0) {
          await prisma.notification.createMany({
            data: otherMembers.map((m: { userId: string }) => ({
              userId: m.userId,
              type: "CALL_STARTED" as const,
              title: "📞 Group call starting!",
              message: `${session.user.name || "Someone"} started a call in the group. Join now!`,
              data: { callId: id, groupId: call.groupId },
            })),
          });
        }
      }
    }

    // Handle meetingUrl update
    if (meetingUrl !== undefined) {
      updateData.meetingUrl = meetingUrl || null;
    }

    const updatedCall = await prisma.callSession.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedCall);
  } catch (error) {
    console.error("Error updating call:", error);
    return NextResponse.json(
      { error: "Failed to update call" },
      { status: 500 }
    );
  }
}
