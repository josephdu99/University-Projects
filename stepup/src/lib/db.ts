import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Preview deployments resolve to the staging Neon branch; Production and
// local development are unchanged. See src/lib/database-url.ts.
const connectionString = resolveDatabaseUrl();

if (!connectionString) {
  throw new Error(
    "No database connection string found. Set DATABASE_URL (or POSTGRES_PRISMA_URL / POSTGRES_URL on Vercel)."
  );
}

const adapter = new PrismaPg({ connectionString });

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
