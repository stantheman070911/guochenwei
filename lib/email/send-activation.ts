// Sends the activation code email via Resend — returns a result object, never throws

import { getResend } from "./resend";
import { buildActivationEmail } from "./templates/activation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendActivationResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Function
// ---------------------------------------------------------------------------

/**
 * Send the activation code email to a newly registered user.
 *
 * Reads RESEND_FROM_EMAIL and NEXT_PUBLIC_APP_URL from env at call time
 * (not module load) so tests can override them.
 *
 * Never throws — returns { success: false, error } on failure.
 */
export async function sendActivationEmail(params: {
  email: string;
  name: string;
  code: string;
}): Promise<SendActivationResult> {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!fromEmail) {
    return { success: false, error: "Missing RESEND_FROM_EMAIL env var" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const { subject, html } = buildActivationEmail({
    name: params.name,
    code: params.code,
    appUrl,
  });

  try {
    await getResend().emails.send({
      from: fromEmail,
      to: params.email,
      subject,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error("[sendActivationEmail] Resend API error:", err);
    const message =
      err instanceof Error ? err.message : "Unknown email sending error";
    return { success: false, error: message };
  }
}
