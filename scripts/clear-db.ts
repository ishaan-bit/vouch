import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const tables = [
  "MessageReaction",
  "ChatRoomParticipant", 
  "ChatMessage",
  "ChatRoom",
  "Notification",
  "Transaction",
  "PromiseWitness",
  "Promise",
  "GroupInvite",
  "GroupMembership",
  "Group",
  "Authenticator",
  "VerificationToken",
  "Session",
  "Account",
  "User",
];

async function clearAll() {
  console.log("🗑️  Clearing all data from Turso...\n");
  
  for (const table of tables) {
    try {
      await client.execute(`DELETE FROM "${table}"`);
      console.log(`✅ Cleared ${table}`);
    } catch (err) {
      console.log(`⏭️  Skipped ${table}`);
    }
  }
  
  console.log("\n🎉 Database cleared! Fresh start ready.");
}

clearAll();
