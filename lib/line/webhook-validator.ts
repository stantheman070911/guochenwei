// Validates incoming LINE webhook requests by verifying the x-line-signature header

import { createHmac, timingSafeEqual } from "crypto";

function getChannelSecret(): string {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) {
    throw new Error(
      "Missing environment variable: LINE_CHANNEL_SECRET must be set before starting the server."
    );
  }
  return secret;
}

/**
 * Verify a LINE webhook request using HMAC-SHA256.
 *
 * IMPORTANT: `rawBody` must be the raw request body string captured via
 * `await request.text()` BEFORE any JSON.parse(). Re-stringifying a parsed
 * object changes whitespace and breaks the hash. See CLAUDE.md pitfall #2.
 *
 * @param rawBody   Raw UTF-8 request body string.
 * @param signature Value of the `x-line-signature` header (base64).
 */
export function validateSignature(
  rawBody: string,
  signature: string
): boolean {
  const digest = createHmac("sha256", getChannelSecret())
    .update(rawBody)
    .digest("base64");

  // timingSafeEqual prevents timing-based side-channel attacks.
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    // Buffers of different lengths throw — treat as invalid.
    return false;
  }
}
