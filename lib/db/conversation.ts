// Reads and writes the last N conversation messages per user for Claude context window management

import { Conversation, ConversationRole } from "@prisma/client";
import { HISTORY_WINDOW } from "../../constants/claude";
import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SaveMessageInput {
  userId: string;
  role: ConversationRole;
  content: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Persist a single chat turn (user or assistant) to the database.
 */
export async function saveMessage(
  input: SaveMessageInput
): Promise<Conversation> {
  return prisma.conversation.create({
    data: {
      user_id: input.userId,
      role: input.role,
      content: input.content,
    },
  });
}

/**
 * Retrieve the most recent `limit` messages for a user, ordered oldest → newest
 * so they can be forwarded directly to the Claude messages array.
 *
 * Defaults to HISTORY_WINDOW (20) when limit is not provided.
 */
export async function getRecentMessages(
  userId: string,
  limit: number = HISTORY_WINDOW
): Promise<Conversation[]> {
  // Fetch newest-first then reverse so caller gets chronological order.
  const rows = await prisma.conversation.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: limit,
  });

  return rows.reverse();
}
