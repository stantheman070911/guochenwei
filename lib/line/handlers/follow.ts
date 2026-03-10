// Handles LINE follow/unfollow events — sends welcome message or cleans up user session

import { UserStatus } from "@prisma/client";
import { getUserByLineId } from "../../db/user";
import { pushMessage } from "../reply";

// ---------------------------------------------------------------------------
// Response strings (no inline magic strings)
// ---------------------------------------------------------------------------

const MSG_WELCOME_BACK =
  "幹 怎麼又是你。";

const MSG_PENDING_REMINDER =
  "衝啥小 啟動碼拿來啊。";

const MSG_UNKNOWN_USER = (appUrl: string) =>
  `你誰啊。先去網站拿啟動碼：${appUrl}`;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * Handle a LINE follow event.
 *
 * State machine:
 *   ACTIVE  → welcome back
 *   PENDING → remind them to send activation code
 *   unknown → point to registration page
 */
export async function handleFollow(lineUserId: string): Promise<void> {
  const user = await getUserByLineId(lineUserId);

  if (user && user.status === UserStatus.ACTIVE) {
    await pushMessage(lineUserId, MSG_WELCOME_BACK);
    return;
  }

  if (user && user.status === UserStatus.PENDING) {
    await pushMessage(lineUserId, MSG_PENDING_REMINDER);
    return;
  }

  // Unknown user — not in our DB at all.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  await pushMessage(lineUserId, MSG_UNKNOWN_USER(appUrl));
}
