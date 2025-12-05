import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

// Determine database URL and config
const getDatabaseConfig = () => {
  // Production: Use Turso URL from environment
  if (process.env.DATABASE_URL?.startsWith("libsql://")) {
    return {
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    };
  }
  // Development: Use local SQLite file
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  return { url: `file:${dbPath}` };
};

const dbConfig = getDatabaseConfig();
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
