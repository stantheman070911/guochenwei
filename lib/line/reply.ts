// Helper — wraps LINE client replyMessage with typed parameters and error handling

import { getLineClient } from "./client";

/**
 * Send a plain-text message to a LINE user.
 * 
 * If a `replyToken` is provided and hasn't expired, it will use the free Reply Message API.
 * If the reply fails (or no token is provided), it gracefully falls back to the Push Message API.
 *
 * NEVER throws — a failed push/reply is logged and swallowed so it cannot crash
 * the webhook handler or any other caller.
 */
export async function sendLineMessage(
  lineUserId: string,
  text: string,
  replyToken?: string
): Promise<void> {
  const client = getLineClient();

  if (replyToken) {
    try {
      await client.replyMessage({ replyToken, messages: [{ type: "text", text }] });
      return; // Success! Free API used.
    } catch (err) {
      console.warn(
        `[sendLineMessage] Reply API failed (token likely expired). Falling back to Push API for ${lineUserId}. Error:`,
        err
      );
      // Fall through to push
    }
  }

  // Push fallback or explicit push request
  try {
    await client.pushMessage({
      to: lineUserId,
      messages: [{ type: "text", text }],
    });
  } catch (err) {
    console.error(
      `[sendLineMessage] Failed to push message to ${lineUserId}:`,
      err
    );
  }
}
