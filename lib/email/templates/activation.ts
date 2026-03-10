// Builds the activation code email as a plain HTML string — no React, lib/ is pure TS

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActivationEmailParams {
  /** User's display name. */
  name: string;
  /** 8-character activation code. */
  code: string;
  /** Base URL of the web app (NEXT_PUBLIC_APP_URL). */
  appUrl: string;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

/**
 * Build the subject line and HTML body for the activation code email.
 *
 * The email is in Traditional Chinese to match the bot's persona.
 * It prominently displays the code and tells the user to send it
 * to the LINE bot.
 */
export function buildActivationEmail(params: ActivationEmailParams): {
  subject: string;
  html: string;
} {
  const { name, code, appUrl } = params;

  const subject = "你的郭寶啟動碼";

  const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
  <h2 style="margin-bottom: 8px;">${name}，你的啟動碼在這</h2>
  <p style="margin-bottom: 24px; color: #555;">把這組碼傳給 LINE 上的郭寶，他才會理你。</p>
  <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
    <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">${code}</span>
  </div>
  <p style="color: #555; font-size: 14px;">步驟：</p>
  <ol style="color: #555; font-size: 14px; padding-left: 20px;">
    <li>打開 LINE，找到「郭寶」</li>
    <li>把上面那串碼直接傳給他</li>
    <li>等他確認，你就可以開始了</li>
  </ol>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  <p style="color: #999; font-size: 12px;">這封信來自 <a href="${appUrl}" style="color: #999;">${appUrl}</a>。如果你沒有註冊，請忽略。</p>
</body>
</html>`;

  return { subject, html };
}
