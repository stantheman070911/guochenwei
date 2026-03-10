// Sends a user message to Claude with the 雞掰管家 system prompt and prior conversation history

import { ConversationRole } from "@prisma/client";
import { CLAUDE_MODEL, MAX_TOKENS } from "../../constants/claude";
import { getActiveGoals } from "../db/goal";
import { getRecentMessages, saveMessage } from "../db/conversation";
import { getAnthropic } from "./client";
import { buildSystemPrompt } from "./system-prompt";

const FALLBACK_REPLY = "吵死了，狗叫什麼。";

import { GoalStatus } from "@prisma/client";
import type { Tool } from "@anthropic-ai/sdk/resources/messages.mjs";

const MANAGE_USER_GOAL_TOOL: Tool = {
  name: "manage_user_goal",
  description: "Create, update, or complete a user's goal based on the conversation. Call this WHENEVER a user commits to a new goal, updates their progress, or finishes an existing goal. DO NOT use this for mere chit-chat.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["create", "update", "complete", "abandon"],
        description: "The action to perform on the goal.",
      },
      goal_id: {
        type: "string",
        description: "REQUIRED for update, complete, or abandon. The exact ID of the goal (found in the system prompt). Omit for 'create'.",
      },
      title: {
        type: "string",
        description: "REQUIRED for 'create'. The concise title of the goal.",
      },
      description: {
        type: "string",
        description: "Optional details, metrics, or context about the goal.",
      },
      due_date: {
        type: "string",
        description: "Optional ISO-8601 date string if the user specified a deadline (e.g., '2025-12-31T23:59:59Z').",
      },
    },
    required: ["action"],
  },
};

/**
 * Send a user message to Claude and return the assistant reply.
 *
 * Context assembly order (per spec):
 *   systemPrompt (with goal injection) → conversationHistory → currentMessage
 *
 * Always saves both the user message and the reply (even the fallback) to the
 * conversations table so history stays consistent.
 */
export async function chat(
  userId: string,
  userMessage: string
): Promise<string> {
  // 1. Fetch context in parallel — DB round-trips should not be sequential.
  const [goals, history] = await Promise.all([
    getActiveGoals(userId),
    getRecentMessages(userId),
  ]);

  // 2. Build system prompt with live goal context.
  const systemPrompt = buildSystemPrompt(goals);

  // 3. Map DB conversation rows to the Claude messages shape.
  const historyMessages = history.map((msg) => ({
    role:
      msg.role === ConversationRole.USER
        ? ("user" as const)
        : ("assistant" as const),
    content: msg.content,
  }));

  // 4. Call Claude — isolate the API call so we can catch failures cleanly.
  let assistantReply = FALLBACK_REPLY;
  try {
    const response = await getAnthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        ...historyMessages,
        { role: "user", content: userMessage },
      ],
      tools: [MANAGE_USER_GOAL_TOOL],
    });

    // 5. Parse response blocks
    for (const block of response.content) {
      if (block.type === "text") {
        assistantReply = block.text;
      } else if (block.type === "tool_use" && block.name === "manage_user_goal") {
        const args = block.input as {
          action: "create" | "update" | "complete" | "abandon";
          goal_id?: string;
          title?: string;
          description?: string;
          due_date?: string;
        };

        try {
          // Dynamic import of goal helpers to avoid circular deps if needed, or rely on top level
          const { createGoal, updateGoal } = await import("../db/goal");

          if (args.action === "create" && args.title) {
            await createGoal(
              userId,
              args.title,
              args.description || undefined,
              args.due_date ? new Date(args.due_date) : undefined
            );
            console.log(`[chat] Tool created goal: ${args.title}`);
          } else if (args.action !== "create" && args.goal_id) {
            let status: GoalStatus | undefined;
            if (args.action === "complete") status = GoalStatus.COMPLETED;
            if (args.action === "abandon") status = GoalStatus.ABANDONED;
            if (args.action === "update") status = GoalStatus.ACTIVE;

            await updateGoal(args.goal_id, userId, {
              title: args.title || undefined,
              description: args.description || undefined,
              status,
              due_date: args.due_date ? new Date(args.due_date) : undefined,
            });
            console.log(`[chat] Tool updated goal: ${args.goal_id} -> ${args.action}`);
          }
        } catch (dbErr) {
          console.error("[chat] Tool use DB failure:", dbErr);
        }
      }
    }
  } catch (err) {
    // Log but never propagate — caller gets the fallback string.
    console.error("[chat] Claude API error:", err);
    assistantReply = FALLBACK_REPLY;
  }

  // 6. Persist both turns regardless of whether Claude succeeded.
  await Promise.all([
    saveMessage({ userId, role: ConversationRole.USER, content: userMessage }),
    saveMessage({
      userId,
      role: ConversationRole.ASSISTANT,
      content: assistantReply,
    }),
  ]);

  return assistantReply;
}
