// Script to add hasAcceptedVouchRules column to Turso database
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

async function migrate() {
  console.log("Adding hasAcceptedVouchRules column to User table...");
  
  try {
    // Check if column already exists
    const tableInfo = await client.execute(`PRAGMA table_info("User")`);
    const columns = tableInfo.rows.map((row: any) => row.name);
    
    if (columns.includes("hasAcceptedVouchRules")) {
      console.log("Column hasAcceptedVouchRules already exists. Skipping.");
      return;
    }
    
    // Add the column
    await client.execute(`
      ALTER TABLE "User" ADD COLUMN "hasAcceptedVouchRules" INTEGER NOT NULL DEFAULT 0
    `);
    
    console.log("✅ Successfully added hasAcceptedVouchRules column!");
  } catch (error) {
    console.error("Error adding column:", error);
    process.exit(1);
  }
}

migrate().then(() => {
  console.log("Migration complete!");
  process.exit(0);
});
