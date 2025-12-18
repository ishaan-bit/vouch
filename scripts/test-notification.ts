// Test script to verify notification creation
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function testNotification() {
  try {
    // Get a user to test with
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log("No users found in database");
      return;
    }

    console.log(`Testing notification for user: ${user.name} (${user.id})`);

    // Count existing notifications
    const existingCount = await prisma.notification.count({
      where: { userId: user.id },
    });
    console.log(`Existing notifications: ${existingCount}`);

    // Try to create a test notification
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: "PACT_MEMBER_ADDED",
        title: "Test notification",
        message: "This is a test",
        data: { test: true },
      },
    });

    console.log("Created notification:", notification);

    // Delete the test notification
    await prisma.notification.delete({ where: { id: notification.id } });
    console.log("Deleted test notification");

    // List all notification types in use
    const types = await prisma.notification.groupBy({
      by: ["type"],
      _count: true,
    });
    console.log("\nNotification types in database:");
    types.forEach((t) => console.log(`  ${t.type}: ${t._count}`));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotification();
