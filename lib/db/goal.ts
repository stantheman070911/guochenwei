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

/**
 * Create a new goal for a user.
 */
export async function createGoal(
  userId: string,
  title: string,
  description?: string,
  dueDate?: Date
): Promise<Goal> {
  return prisma.goal.create({
    data: {
      user_id: userId,
      title,
      description,
      due_date: dueDate,
      status: GoalStatus.ACTIVE,
    },
  });
}

/**
 * Update an existing goal (e.g. status completion, new title, new dates).
 */
export async function updateGoal(
  goalId: string,
  userId: string, // included for security — ensure user owns the goal
  data: {
    title?: string;
    description?: string;
    status?: GoalStatus;
    due_date?: Date;
  }
): Promise<Goal | null> {
  // First ensure the goal belongs to the user
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.user_id !== userId) {
    return null;
  }

  return prisma.goal.update({
    where: { id: goalId },
    data,
  });
}
