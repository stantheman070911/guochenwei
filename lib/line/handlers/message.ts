// Handles LINE text message events — looks up user, calls Claude, replies with AI response

import { UserStatus } from "@prisma/client";
import { getUserByLineId } from "../../db/user";
import { validateCode } from "../../auth/validate-code";
import { chat } from "../../claude/chat";
import { pushMessage } from "../reply";

// ---------------------------------------------------------------------------
// Response strings (no inline magic strings)
// ---------------------------------------------------------------------------

const MSG_NOT_REGISTERED = (appUrl: string) =>
  `你還沒在我們系統裡。去這裡註冊：${appUrl}`;

const MSG_ACTIVATION_SUCCESS =
  "好，你被我盯上了。說說你要做什麼。";

const MSG_ACTIVATION_INVALID =
  "這什麼鬼碼，去網站重新拿。";

const MSG_ACTIVATION_EXPIRED =
  "碼過期了，去網站重新拿一個。";

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Handle an incoming text message from a LINE user.
 *
 * Flow:
 *   1. Look up user by LINE user ID.
 *   2. ACTIVE   → hand off to Claude chat.
 *   3. PENDING  → try to validate text as activation code.
 *   4. Not found → try text as activation code (line_user_id isn't linked yet
 *      at this stage, so the user won't be found by LINE ID even if they
 *      registered on the website). If the code is invalid, prompt to register.
 */
export async function handleMessage(
  lineUserId: string,
  text: string
): Promise<void> {
  const user = await getUserByLineId(lineUserId);

  // ── Active user — hand off to Claude ─────────────────────────────────────
  if (user?.status === UserStatus.ACTIVE) {
    const reply = await chat(user.id, text);
    await pushMessage(lineUserId, reply);
    return;
  }

  // ── PENDING or unknown user — try the message as an activation code ──────
  // This covers both cases:
  //   a) User found as PENDING (line_user_id already linked from a previous attempt)
  //   b) User NOT found by LINE ID (registered on web but line_user_id is still null)
  // In both cases, validateCode will link the LINE ID and activate the user.
  const trimmed = text.trim();
  if (trimmed.length > 0) {
    const result = await validateCode(trimmed, lineUserId);

    if (result.valid) {
      await pushMessage(lineUserId, MSG_ACTIVATION_SUCCESS);
      return;
    }

    // Code was invalid — give context-specific feedback
    if (result.error === "EXPIRED") {
      await pushMessage(lineUserId, MSG_ACTIVATION_EXPIRED);
      return;
    }

    // For PENDING users, any non-code text gets the "invalid code" response.
    // For unknown users (NOT_FOUND), prompt them to register on the website.
    if (user) {
      // User exists but PENDING — they sent something that isn't a valid code
      await pushMessage(lineUserId, MSG_ACTIVATION_INVALID);
      return;
    }
  }

  // ── Truly unknown user — not in our DB at all ─────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  await pushMessage(lineUserId, MSG_NOT_REGISTERED(appUrl));
}
