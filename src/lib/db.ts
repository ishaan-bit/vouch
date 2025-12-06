import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Determine database URL and config
const getDatabaseConfig = () => {
  // Production: Use Turso
  if (process.env.TURSO_DATABASE_URL) {
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
  return { url: "file:./prisma/dev.db" };
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
