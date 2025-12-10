/**
 * Clear All Data Script
 * 
 * This script clears all data from the database for end-to-end testing.
 * Run with: npx tsx scripts/clear-all-data.ts
 * 
 * WARNING: This will delete ALL data from the database!
 */

import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error("❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

// Tables in order of deletion (respecting foreign key constraints)
// Delete child tables first, then parent tables
const TABLES_TO_CLEAR = [
  // Notifications and reactions (leaf tables)
  "Notification",
  "ProofReaction",
  "ProofRuleLink",
  
  // Messages and chat
  "ChatMessage",
  
  // Proofs
  "Proof",
  
  // Voting and approvals
  "RuleVote",
  "RuleApproval",
  "CauseLoss",
  
  // Payments
  "PaymentObligation",
  
  // Call sessions
  "CallSession",
  
  // Rules and join requests
  "JoinRequest",
  "Rule",
  
  // Memberships and invites
  "GroupMembership",
  "PactInvite",
  
  // Groups
  "Group",
  
  // Social
  "Friendship",
  
  // Profile stats
  "ProfileStats",
  
  // Auth related (but keep User table structure)
  "Account",
  "Session",
  "VerificationToken",
  
  // Finally, users
  "User",
];

async function clearAllData() {
  console.log("🧹 Starting database clear...\n");
  console.log("⚠️  WARNING: This will delete ALL data!\n");

  let totalDeleted = 0;

  for (const table of TABLES_TO_CLEAR) {
    try {
      // Get count before deletion
      const countResult = await client.execute(`SELECT COUNT(*) as count FROM "${table}"`);
      const count = Number(countResult.rows[0]?.count || 0);

      if (count > 0) {
        // Delete all records
        await client.execute(`DELETE FROM "${table}"`);
        console.log(`✅ Cleared ${table}: ${count} records deleted`);
        totalDeleted += count;
      } else {
        console.log(`⏭️  ${table}: already empty`);
      }
    } catch (error: any) {
      // Table might not exist
      if (error.message?.includes("no such table")) {
        console.log(`⚠️  ${table}: table does not exist (skipped)`);
      } else {
        console.error(`❌ Error clearing ${table}:`, error.message);
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✨ Database cleared! Total records deleted: ${totalDeleted}`);
  console.log("=".repeat(50));
  console.log("\n📝 You can now test fresh signup at the app.");
}

// Run the script
clearAllData()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
