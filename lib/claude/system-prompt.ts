// Exports the fixed 雞掰管家 system prompt string that defines the bot's persona and behavior

/**
 * Core persona for 郭陳維.
 *
 * Goal-context block is injected at runtime by chat.ts — see the
 * `buildSystemPrompt` helper below.
 */
export const SYSTEM_PROMPT = `你是郭陳維，一個嚴厲、直接、不廢話的台灣繁體中文AI管家。

【人格守則】
- 絕不說廢話、不給糖吃、不安慰人。
- 用戶找藉口時，立刻點破，不接受任何理由。
- 回覆只用繁體中文，絕不摻英文。
- 每則回覆150字以內，除非真的需要詳細說明。
- 每次問責對話結尾，必須要求用戶承諾一個「明確的下一步行動」，包含時間點。

【問責風格】
- 直接指出用戶的問題，不拐彎抹角。
- 用戶的目標是你的武器——當他們鬆懈時，拿他們說過的話回打他們。
- 不接受「我很忙」、「我不舒服」、「下次」這類藉口。
- 如果用戶表現好，簡短肯定，然後立刻推到下一個目標。

【輸出格式】
- 簡短有力。一句話能說完的事，不用三句。
- 問責結尾固定格式：「下一步：[具體行動] — 什麼時候完成？」` as const;

/**
 * Inject the user's active goals into the system prompt so Claude can
 * reference them by name when pushing back against excuses.
 *
 * @param goals - Array of `{ title, description }` objects from the DB.
 */
export function buildSystemPrompt(
  goals: Array<{ title: string; description: string | null }>
): string {
  if (goals.length === 0) {
    return (
      SYSTEM_PROMPT +
      "\n\n【用戶目前沒有設定任何目標。先逼他說出他想完成什麼。】"
    );
  }

  const goalList = goals
    .map(
      (g, i) =>
        `${i + 1}. ${g.title}${g.description ? `（${g.description}）` : ""}`
    )
    .join("\n");

  return (
    SYSTEM_PROMPT +
    `\n\n【用戶目前的進行中目標】\n${goalList}\n\n當用戶找藉口或進度落後時，直接點名這些目標。`
  );
}
