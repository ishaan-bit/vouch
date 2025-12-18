import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
// Prisma client regenerated with DeletionStatus enum, GroupDeletionVote model

// Determine database URL and config
const getDatabaseConfig = () => {
  // Production: Use Turso
  if (process.env.TURSO_DATABASE_URL) {
    console.log("Using Turso database:", process.env.TURSO_DATABASE_URL.substring(0, 30) + "...");
    return {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    };
  }
  // Fallback: DATABASE_URL 
  if (process.env.DATABASE_URL?.startsWith("libsql://")) {
    return {
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    };
  }
  // Development: Use local SQLite file
  console.log("Using local SQLite database");
  return { url: "file:./prisma/dev.db" };
};

const dbConfig = getDatabaseConfig();

// Create adapter - handle potential initialization errors
let adapter: PrismaLibSql;
try {
  adapter = new PrismaLibSql(dbConfig);
} catch (err) {
  console.error("Failed to create Prisma adapter:", err);
  throw new Error(`Failed to initialize database adapter: ${err instanceof Error ? err.message : "Unknown error"}`);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
