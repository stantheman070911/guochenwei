// Helper — wraps LINE client replyMessage with typed parameters and error handling

import { getLineClient } from "./client";

/**
 * Push a plain-text message to a LINE user.
 *
 * Uses the Push Message API (not reply tokens) so this works both inside
 * webhook handlers and from scheduled jobs / cron tasks.
 *
 * NEVER throws — a failed push is logged and swallowed so it cannot crash
 * the webhook handler or any other caller.
 */
export async function pushMessage(
  lineUserId: string,
  text: string
): Promise<void> {
  try {
    await getLineClient().pushMessage({
      to: lineUserId,
      messages: [{ type: "text", text }],
    });
  } catch (err) {
    console.error(
      `[pushMessage] Failed to push message to ${lineUserId}:`,
      err
    );
  }
}
