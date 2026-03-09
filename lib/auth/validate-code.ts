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

  // Consume the code and activate the user in parallel — both must succeed.
  await Promise.all([
    markCodeUsed(record.id),
    linkLineId(record.user_id, lineUserId),
    activateUser(record.user_id),
  ]);

  return { valid: true, userId: record.user_id };
}
