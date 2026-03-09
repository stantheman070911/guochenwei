// Claude model name (claude-sonnet-4-20250514), max tokens per response, and history window size

/** Anthropic model ID used for all chat completions. */
export const CLAUDE_MODEL = "claude-sonnet-4-20250514" as const;

/** Hard upper bound on tokens the model may produce per reply. */
export const MAX_TOKENS = 1000 as const;

/**
 * Number of past conversation turns loaded into the Claude context window.
 * Each turn is one message (user or assistant).
 */
export const HISTORY_WINDOW = 20 as const;
