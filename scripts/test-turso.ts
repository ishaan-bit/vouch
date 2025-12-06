// Test Turso database connection and schema
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function test() {
  console.log("Testing Turso connection...\n");
  
  // Check Group table schema
  console.log("=== Group table schema ===");
  const groupSchema = await client.execute('PRAGMA table_info("Group")');
  groupSchema.rows.forEach(row => {
    console.log(`  ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PK' : ''}`);
  });
  
  // Check if any groups exist
  console.log("\n=== Groups in database ===");
  const groups = await client.execute('SELECT id, name, createdByUserId FROM "Group" LIMIT 5');
  if (groups.rows.length === 0) {
    console.log("  No groups found");
  } else {
    groups.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.name} (creator: ${row.createdByUserId})`);
    });
  }
  
  // Check User table
  console.log("\n=== Users in database ===");
  const users = await client.execute('SELECT id, name, email FROM "User" LIMIT 5');
  if (users.rows.length === 0) {
    console.log("  No users found");
  } else {
    users.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.name} (${row.email})`);
    });
  }

  // Check GroupMembership table
  console.log("\n=== GroupMemberships ===");
  const memberships = await client.execute('SELECT * FROM "GroupMembership" LIMIT 5');
  if (memberships.rows.length === 0) {
    console.log("  No memberships found");
  } else {
    memberships.rows.forEach(row => {
      console.log(`  User ${row.userId} in Group ${row.groupId}`);
    });
  }

  // Test a join query like Prisma would do
  console.log("\n=== Testing join query (Group + creator) ===");
  try {
    const joinResult = await client.execute(`
      SELECT g.id, g.name, g.createdByUserId, u.name as creatorName 
      FROM "Group" g 
      LEFT JOIN "User" u ON g.createdByUserId = u.id
      LIMIT 5
    `);
    console.log("  Join query succeeded!");
    joinResult.rows.forEach(row => {
      console.log(`  ${row.name} created by ${row.creatorName || 'UNKNOWN'}`);
    });
  } catch (error) {
    console.error("  Join query failed:", error);
  }

  console.log("\n✅ Test complete");
}

test().catch(console.error);
