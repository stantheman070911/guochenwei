// Sends a user message to Claude with the 郭寶 system prompt and prior conversation history

import { ConversationRole, GoalStatus } from "@prisma/client";
import type { Tool, MessageParam, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages.mjs";
import { CLAUDE_MODEL, MAX_TOKENS } from "../../constants/claude";
import { getActiveGoals, createGoal, updateGoal } from "../db/goal";
import { getRecentMessages, saveMessage } from "../db/conversation";
import { getAnthropic } from "./client";
import { buildSystemPrompt } from "./system-prompt";

const FALLBACK_REPLY = "吵死了，狗叫什麼。";

/** Max rounds of tool use before we force a text reply. */
const MAX_TOOL_ROUNDS = 3;

const MANAGE_USER_GOAL_TOOL: Tool = {
  name: "manage_user_goal",
  description:
    "Create, update, or complete a user's goal based on the conversation. Call this WHENEVER a user commits to a new goal, updates their progress, or finishes an existing goal. DO NOT use this for mere chit-chat.",
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
        description:
          "REQUIRED for update, complete, or abandon. The exact ID of the goal (found in the system prompt). Omit for 'create'.",
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
        description:
          "Optional ISO-8601 date string if the user specified a deadline (e.g., '2025-12-31T23:59:59Z').",
      },
      remind_at: {
        type: "string",
        description: "REQUIRED if the user asks for a reminder at a specific time or duration (e.g., 'in 10 mins', 'at 9am'). Calculate the exact ISO-8601 timestamp based on the current time provided in the system prompt.",
      },
    },
    required: ["action"],
  },
};

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

interface GoalToolArgs {
  action: "create" | "update" | "complete" | "abandon";
  goal_id?: string;
  title?: string;
  description?: string;
  due_date?: string;
  remind_at?: string;
}

/**
 * Execute a manage_user_goal tool call. Returns a short result string for the
 * tool_result message sent back to Claude.
 */
async function executeGoalTool(
  userId: string,
  args: GoalToolArgs
): Promise<string> {
  if (args.action === "create" && args.title) {
    const goal = await createGoal(
      userId,
      args.title,
      args.description || undefined,
      args.due_date ? new Date(args.due_date) : undefined,
      args.remind_at ? new Date(args.remind_at) : undefined
    );
    console.log(`[chat] Tool created goal: ${args.title}`);

    if (args.remind_at) {
      const remindTime = new Date(args.remind_at);
      try {
        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com"}/api/line/push-reminder`;
        await fetch(`https://qstash.upstash.io/v2/publish/${webhookUrl}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.QSTASH_TOKEN}`,
            "Upstash-Not-Before": String(Math.floor(remindTime.getTime() / 1000)),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ userId: userId, goalId: goal.id })
        });
        console.log(`[chat] Scheduled QStash reminder for goal ${goal.id} at ${args.remind_at}`);
      } catch (e) {
        console.error("[chat] Failed to schedule QStash reminder:", e);
      }
    }

    return `Goal "${args.title}" created.`;
  }

  if (args.action !== "create" && args.goal_id) {
    let status: GoalStatus | undefined;
    if (args.action === "complete") status = GoalStatus.COMPLETED;
    if (args.action === "abandon") status = GoalStatus.ABANDONED;
    if (args.action === "update") status = GoalStatus.ACTIVE;

    const result = await updateGoal(args.goal_id, userId, {
      title: args.title || undefined,
      description: args.description || undefined,
      status,
      due_date: args.due_date ? new Date(args.due_date) : undefined,
      remind_at: args.remind_at ? new Date(args.remind_at) : undefined,
    });

    if (!result) {
      console.warn(`[chat] Tool update failed — goal not found or not owned: ${args.goal_id}`);
      return `Goal ${args.goal_id} not found or not owned by user.`;
    }

    if (args.remind_at) {
      const remindTime = new Date(args.remind_at);
      try {
        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://your-domain.com"}/api/line/push-reminder`;
        await fetch(`https://qstash.upstash.io/v2/publish/${webhookUrl}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.QSTASH_TOKEN}`,
            "Upstash-Not-Before": String(Math.floor(remindTime.getTime() / 1000)),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ userId: userId, goalId: result.id })
        });
        console.log(`[chat] Scheduled QStash reminder for goal ${result.id} at ${args.remind_at}`);
      } catch (e) {
        console.error("[chat] Failed to schedule QStash reminder:", e);
      }
    }

    console.log(`[chat] Tool updated goal: ${args.goal_id} -> ${args.action}`);
    return `Goal ${args.goal_id} ${args.action}d.`;
  }

  return "Invalid tool arguments — missing required fields.";
}

// ---------------------------------------------------------------------------
// Main chat function
// ---------------------------------------------------------------------------

/**
 * Send a user message to Claude and return the assistant reply.
 *
 * Context assembly order (per spec):
 *   systemPrompt (with goal injection) → conversationHistory → currentMessage
 *
 * When Claude calls the manage_user_goal tool, we execute it and send the
 * result back in a follow-up API call so Claude can produce a proper text
 * response that acknowledges the action.
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
  const messages: MessageParam[] = [
    ...history.map((msg) => ({
      role:
        msg.role === ConversationRole.USER
          ? ("user" as const)
          : ("assistant" as const),
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  // 4. Call Claude with tool-result loop.
  let assistantReply = FALLBACK_REPLY;
  try {
    let round = 0;

    while (round < MAX_TOOL_ROUNDS) {
      round++;

      const response = await getAnthropic().messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
        tools: [MANAGE_USER_GOAL_TOOL],
      });

      // Extract text from this response (may coexist with tool_use blocks).
      for (const block of response.content) {
        if (block.type === "text" && block.text.trim()) {
          assistantReply = block.text;
        }
      }

      // If the model finished naturally, we're done.
      if (response.stop_reason !== "tool_use") {
        break;
      }

      // Process all tool_use blocks and build tool_result messages.
      const toolResults: ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use" && block.name === "manage_user_goal") {
          let resultText: string;
          try {
            resultText = await executeGoalTool(userId, block.input as GoalToolArgs);
          } catch (dbErr) {
            console.error("[chat] Tool use DB failure:", dbErr);
            resultText = "Database error — tool execution failed.";
          }

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: resultText,
          });
        }
      }

      // Append the assistant's response (including tool_use blocks) and
      // our tool results to the message chain for the next round.
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    }
  } catch (err) {
    // Log but never propagate — caller gets the fallback string.
    console.error("[chat] Claude API error:", err);
    assistantReply = FALLBACK_REPLY;
  }

  // 5. Persist both turns regardless of whether Claude succeeded.
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
