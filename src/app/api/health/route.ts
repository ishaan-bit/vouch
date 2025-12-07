import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
    },
  };

  // Test database connection
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    checks.database = {
      status: "connected",
      result,
    };
  } catch (error) {
    checks.database = {
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Test a simple query
  try {
    const userCount = await prisma.user.count();
    checks.userCount = userCount;
  } catch (error) {
    checks.userCountError = error instanceof Error ? error.message : "Unknown";
  }

  // Test DmThread table
  try {
    const threadCount = await prisma.dmThread.count();
    checks.dmThreadCount = threadCount;
  } catch (error) {
    checks.dmThreadError = error instanceof Error ? error.message : "Unknown";
  }

  // Test ChatMessage table
  try {
    const msgCount = await prisma.chatMessage.count();
    checks.chatMessageCount = msgCount;
  } catch (error) {
    checks.chatMessageError = error instanceof Error ? error.message : "Unknown";
  }

  return NextResponse.json(checks);
}
