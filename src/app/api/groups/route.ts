import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { createGroupSchema } from "@/lib/validation";
import { nanoid } from "nanoid";

// GET /api/groups - List user's groups
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await prisma.group.findMany({
      where: {
        memberships: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        rules: {
          select: {
            id: true,
            creatorId: true,
          },
        },
        _count: {
          select: {
            rules: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch groups", details: message },
      { status: 500 }
    );
  }
}

// POST /api/groups - Create a new group
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = createGroupSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().formErrors[0] || "Invalid input" },
        { status: 400 }
      );
    }

    const { name, description, durationDays } = result.data;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${nanoid(6)}`;

    const group = await prisma.group.create({
      data: {
        name,
        slug,
        description,
        durationDays,
        createdByUserId: session.user.id,
        memberships: {
          create: {
            userId: session.user.id,
            role: "CREATOR",
          },
        },
      },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}
