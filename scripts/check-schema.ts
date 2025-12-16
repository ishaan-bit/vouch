import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function checkAndFix() {
  console.log("Checking table structures...\n");

  const tables = [
    "User",
    "Group", 
    "GroupMembership",
    "Rule",
    "RuleApproval",
    "Notification",
    "CallSession",
    "Proof",
  ];

  for (const t of tables) {
    try {
      const r = await client.execute(`PRAGMA table_info("${t}")`);
      console.log(`${t}:`, r.rows.map((x) => x.name).join(", "));
    } catch (e) {
      console.log(`${t}: ERROR -`, (e as Error).message);
    }
  }

  console.log("\n--- Fixing missing columns ---\n");

  // Add hasAcceptedVouchRules to User if missing
  try {
    await client.execute(`ALTER TABLE "User" ADD COLUMN "hasAcceptedVouchRules" INTEGER DEFAULT 0`);
    console.log("Added hasAcceptedVouchRules to User");
  } catch (e) {
    console.log("User.hasAcceptedVouchRules:", (e as Error).message.includes("duplicate") ? "exists" : (e as Error).message);
  }

  // Add meetingUrl to CallSession if missing
  try {
    await client.execute(`ALTER TABLE "CallSession" ADD COLUMN "meetingUrl" TEXT`);
    console.log("Added meetingUrl to CallSession");
  } catch (e) {
    console.log("CallSession.meetingUrl:", (e as Error).message.includes("duplicate") ? "exists" : (e as Error).message);
  }

  console.log("\nDone!");
}

checkAndFix();
