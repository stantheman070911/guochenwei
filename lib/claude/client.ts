// Initializes and exports the Anthropic client singleton using ANTHROPIC_API_KEY from env

import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error(
    "Missing environment variable: ANTHROPIC_API_KEY must be set before starting the server."
  );
}

export const anthropic = new Anthropic({ apiKey });
