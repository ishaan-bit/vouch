// Test Prisma query directly
import prisma from "../src/lib/db";

async function test() {
  const groupId = "cmitxamnc000004la2go6s8s0";
  
  console.log("Testing Prisma query for group:", groupId);
  console.log("");
  
  try {
    // Test 1: Simple findUnique
    console.log("=== Test 1: Simple findUnique ===");
    const simple = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true },
    });
    console.log("Result:", simple);
    
    // Test 2: With creator relation
    console.log("\n=== Test 2: With creator relation ===");
    const withCreator = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });
    console.log("Result:", withCreator);
    
    // Test 3: With memberships
    console.log("\n=== Test 3: With memberships ===");
    const withMemberships = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
                upiId: true,
              },
            },
          },
        },
      },
    });
    console.log("Result:", JSON.stringify(withMemberships, null, 2));
    
    // Test 4: With rules
    console.log("\n=== Test 4: With rules ===");
    const withRules = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        rules: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            approvals: true,
          },
        },
      },
    });
    console.log("Result:", JSON.stringify(withRules, null, 2));
    
    // Test 5: Full query like the page does
    console.log("\n=== Test 5: Full query (like page) ===");
    const full = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
                upiId: true,
              },
            },
          },
        },
        rules: {
          where: {
            approved: true,
          },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            approvals: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        joinRequests: {
          where: {
            userId: "cmiskxyhk000004k1sa43vd35", // the user ID
          },
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: {
            proofs: true,
          },
        },
      },
    });
    console.log("Result:", JSON.stringify(full, null, 2));
    
    console.log("\n✅ All Prisma queries succeeded!");
    
  } catch (error) {
    console.error("\n❌ Prisma query failed!");
    console.error("Error:", error);
  }
  
  await prisma.$disconnect();
}

test();
