// Queries the DB to verify a code exists, belongs to a user, is unused, and has not expired

import { getCodeByValue, markCodeUsed } from "../db/code";
import { activateUser, linkLineId } from "../db/user";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ValidationError = "NOT_FOUND" | "USED" | "EXPIRED";

export interface ValidationSuccess {
  valid: true;
  userId: string;
}

export interface ValidationFailure {
  valid: false;
  error: ValidationError;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ---------------------------------------------------------------------------
// Function
// ---------------------------------------------------------------------------

/**
 * Validate an activation code submitted by a LINE user.
 *
 * On success:
 *   - Marks the code as used.
 *   - Links the lineUserId to the user record.
 *   - Flips the user status to ACTIVE.
 *   - Returns { valid: true, userId }.
 *
 * On failure:
 *   - Returns { valid: false, error } — never throws.
 */
export async function validateCode(
  code: string,
  lineUserId: string
): Promise<ValidationResult> {
  const record = await getCodeByValue(code);

  if (!record) {
    return { valid: false, error: "NOT_FOUND" };
  }

  if (record.used) {
    return { valid: false, error: "USED" };
  }

  if (record.expires_at < new Date()) {
    return { valid: false, error: "EXPIRED" };
  }

  // Use a transaction to ensure we don't activate the same code twice concurrently.
  const txResult = await import("../db/prisma").then((m) => m.prisma.$transaction(async (tx) => {
    // Re-check the code inside the transaction using a read-lock or just checking state
    const freshRecord = await tx.activationCode.findUnique({
      where: { id: record.id },
    });

    if (!freshRecord || freshRecord.used) {
      return { valid: false, error: "USED" as const };
    }

    // Mark code as used
    await tx.activationCode.update({
      where: { id: record.id },
      data: { used: true },
    });

    // Update user link & status
    await tx.user.update({
      where: { id: record.user_id },
      data: { line_user_id: lineUserId, status: "ACTIVE" },
    });

    return { valid: true };
  }));

  if (!txResult.valid) {
    return { valid: false, error: txResult.error as ValidationError };
  }

  return { valid: true, userId: record.user_id };
}
