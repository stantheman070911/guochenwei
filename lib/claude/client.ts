// Lazy-initialized Anthropic client singleton — deferred to avoid build-time throws

import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing environment variable: ANTHROPIC_API_KEY must be set before starting the server."
      );
    }
    _anthropic = new Anthropic({ apiKey });
  }
  return _anthropic;
}
