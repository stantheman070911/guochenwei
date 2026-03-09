// CRUD helpers for ActivationCode — createCode, getCodeByValue, markCodeUsed

import { ActivationCode } from "@prisma/client";
import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateCodeInput {
  code: string;
  userId: string;
  expiresAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Persist a newly-generated activation code linked to a user.
 */
export async function createCode(input: CreateCodeInput): Promise<ActivationCode> {
  return prisma.activationCode.create({
    data: {
      code: input.code,
      user_id: input.userId,
      expires_at: input.expiresAt,
    },
  });
}

/**
 * Look up an activation code by its string value.
 * Includes the associated user so callers don't need a second query.
 * Returns null when not found.
 */
export async function getCodeByValue(
  code: string
): Promise<(ActivationCode & { user: import("@prisma/client").User }) | null> {
  return prisma.activationCode.findUnique({
    where: { code },
    include: { user: true },
  });
}

/**
 * Mark an activation code as consumed so it cannot be reused.
 */
export async function markCodeUsed(codeId: string): Promise<ActivationCode> {
  return prisma.activationCode.update({
    where: { id: codeId },
    data: { used: true },
  });
}
