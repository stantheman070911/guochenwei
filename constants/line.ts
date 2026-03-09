// LINE channel config keys and constants — webhook path, reply endpoint base URL, event types

/** Route that LINE delivers webhook events to. Must match the setting in LINE Developers console. */
export const WEBHOOK_PATH = "/api/line/webhook" as const;

/** Base URL for LINE Messaging API v2 calls. */
export const LINE_API_BASE = "https://api.line.me/v2/bot" as const;

/** Webhook event type sent when a user sends a text (or other) message. */
export const EVENT_TYPE_MESSAGE = "message" as const;

/** Webhook event type sent when a user follows (adds) the bot. */
export const EVENT_TYPE_FOLLOW = "follow" as const;
