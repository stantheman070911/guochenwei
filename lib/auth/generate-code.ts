// Generates a cryptographically random, URL-safe alphanumeric activation code of fixed length

import { randomBytes } from "crypto";

const CODE_LENGTH = 8;
// Alphabet: uppercase letters + digits, no ambiguous chars (0/O, 1/I/l)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate a cryptographically random activation code of CODE_LENGTH characters.
 * Uses rejection sampling to guarantee uniform distribution over ALPHABET.
 */
export function generateCode(): string {
  const alphabetLength = ALPHABET.length; // 32 — power of 2, no bias
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % alphabetLength];
  }
  return code;
}
