// Handles LINE follow/unfollow events — sends welcome message or cleans up user session

import { UserStatus } from "@prisma/client";
import { getUserByLineId } from "../../db/user";
import { pushMessage } from "../reply";

// ---------------------------------------------------------------------------
// Response strings (no inline magic strings)
// ---------------------------------------------------------------------------

const MSG_WELCOME_BACK =
  "你回來了。廢話少說，繼續你的目標。";

const MSG_PENDING_REMINDER =
  "你還沒啟動。把你的啟動碼傳給我，快點。";

const MSG_UNKNOWN_USER = (appUrl: string) =>
  `我不認識你。先去網站拿啟動碼：${appUrl}`;

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
