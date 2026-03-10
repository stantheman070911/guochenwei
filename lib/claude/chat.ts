// Sends a user message to Claude with the 雞掰管家 system prompt and prior conversation history

import { ConversationRole } from "@prisma/client";
import { CLAUDE_MODEL, MAX_TOKENS } from "../../constants/claude";
import { getActiveGoals } from "../db/goal";
import { getRecentMessages, saveMessage } from "../db/conversation";
import { getAnthropic } from "./client";
import { buildSystemPrompt } from "./system-prompt";

const FALLBACK_REPLY = "我在想事情，等一下再說。";

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
  //    ConversationRole enum values are USER / ASSISTANT (uppercase).
  const historyMessages = history.map((msg) => ({
    role:
      msg.role === ConversationRole.USER
        ? ("user" as const)
        : ("assistant" as const),
    content: msg.content,
  }));

  // 4. Call Claude — isolate the API call so we can catch failures cleanly.
  let assistantReply: string;
  try {
    const response = await getAnthropic().messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [
        ...historyMessages,
        { role: "user", content: userMessage },
      ],
    });

    // Extract the first text block from the response.
    const block = response.content[0];
    assistantReply = block.type === "text" ? block.text : FALLBACK_REPLY;
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
