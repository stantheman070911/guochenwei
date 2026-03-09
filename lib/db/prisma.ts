// Exports a Prisma Client singleton to prevent multiple instances in Next.js hot-reload dev mode

import { PrismaClient } from "@prisma/client";

// Extend globalThis so TypeScript knows about our cached client.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

// Cache the instance in dev so hot-reload doesn't open a new connection pool
// on every module evaluation.  In production this branch is never reached
// because modules are evaluated only once.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
