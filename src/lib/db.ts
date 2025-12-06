import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Determine database URL and config
const getDatabaseConfig = () => {
  // Production: Use Turso
  if (process.env.TURSO_DATABASE_URL) {
    console.log("[DB] Using Turso database");
    return {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    };
  }
  // Fallback: DATABASE_URL 
  if (process.env.DATABASE_URL?.startsWith("libsql://")) {
    console.log("[DB] Using DATABASE_URL (libsql)");
    return {
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    };
  }
  // Development: Use local SQLite file
  console.log("[DB] Using local SQLite file");
  return { url: "file:./prisma/dev.db" };
};

const dbConfig = getDatabaseConfig();

// Validate config in production
if (process.env.NODE_ENV === "production" && !process.env.TURSO_DATABASE_URL) {
  console.error("[DB ERROR] TURSO_DATABASE_URL is not set in production!");
}

const adapter = new PrismaLibSql(dbConfig);

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
