// DB helpers for the Goal model — getActiveGoals

import { Goal, GoalStatus } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Return all ACTIVE goals for a user, ordered by creation date ascending.
 * Used by chat() to inject goal context into the Claude system prompt.
 */
export async function getActiveGoals(userId: string): Promise<Goal[]> {
  return prisma.goal.findMany({
    where: { user_id: userId, status: GoalStatus.ACTIVE },
    orderBy: { created_at: "asc" },
  });
}
