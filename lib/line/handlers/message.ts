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
 *   2. Not found → send registration prompt.
 *   3. PENDING  → try to validate text as activation code.
 *                  Success → activate + welcome message.
 *                  Failure → error message.
 *   4. ACTIVE   → call chat() and push the AI reply.
 */
export async function handleMessage(
  lineUserId: string,
  text: string
): Promise<void> {
  const user = await getUserByLineId(lineUserId);

  // ── Not registered ────────────────────────────────────────────────────────
  if (!user) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await pushMessage(lineUserId, MSG_NOT_REGISTERED(appUrl));
    return;
  }

  // ── Pending activation ────────────────────────────────────────────────────
  if (user.status === UserStatus.PENDING) {
    const result = await validateCode(text.trim(), lineUserId);

    if (result.valid) {
      await pushMessage(lineUserId, MSG_ACTIVATION_SUCCESS);
      return;
    }

    // Give slightly more specific feedback for expired codes.
    const reply =
      result.error === "EXPIRED"
        ? MSG_ACTIVATION_EXPIRED
        : MSG_ACTIVATION_INVALID;
    await pushMessage(lineUserId, reply);
    return;
  }

  // ── Active user — hand off to Claude ─────────────────────────────────────
  const reply = await chat(user.id, text);
  await pushMessage(lineUserId, reply);
}
