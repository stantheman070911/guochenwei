// CRUD helpers for the User model — createUser, getUserByEmail, getUserByLineId, linkLineId, activateUser

import { User, UserStatus } from "@prisma/client";
import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateUserInput {
  email: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Insert a new user with PENDING status.
 * Throws if the email already exists (unique constraint).
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      status: UserStatus.PENDING,
    },
  });
}

/**
 * Find a user by email address.
 * Returns null when not found.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

/**
 * Find a user by their LINE user ID.
 * Returns null when not found.
 */
export async function getUserByLineId(
  lineUserId: string
): Promise<User | null> {
  return prisma.user.findUnique({ where: { line_user_id: lineUserId } });
}

/**
 * Associate a LINE user ID with an existing user record.
 * Call this immediately after successful activation-code verification.
 */
export async function linkLineId(
  userId: string,
  lineUserId: string
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { line_user_id: lineUserId },
  });
}

/**
 * Flip a user's status from PENDING → ACTIVE.
 * Typically called together with linkLineId after code verification.
 */
export async function activateUser(userId: string): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { status: UserStatus.ACTIVE },
  });
}
