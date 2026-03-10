// POST /api/line/webhook — validate LINE signature → parse events → dispatch handlers
//
// IMPORTANT: Returns 200 immediately and processes events in the background
// via next/server `after()`. This prevents Vercel's 10s timeout from killing
// the request while Claude API calls are in flight.

import { NextRequest, NextResponse, after } from "next/server";
import { validateSignature } from "@/lib/line/webhook-validator";
import { handleMessage } from "@/lib/line/handlers/message";
import { handleFollow } from "@/lib/line/handlers/follow";
import { EVENT_TYPE_MESSAGE, EVENT_TYPE_FOLLOW } from "@/constants/line";

// ---------------------------------------------------------------------------
// LINE webhook event shape (minimal types for parsing)
// ---------------------------------------------------------------------------

interface LineEvent {
  type: string;
  source?: { type: string; userId?: string };
  message?: { type: string; text?: string };
}

interface LineWebhookBody {
  events: LineEvent[];
}

// ---------------------------------------------------------------------------
// Background event processor
// ---------------------------------------------------------------------------

async function processEvents(events: LineEvent[]): Promise<void> {
  const results = await Promise.allSettled(
    events.map((event) => {
      const lineUserId = event.source?.userId;
      if (!lineUserId) {
        console.log("[webhook] Skipping event with no userId:", event.type);
        return;
      }

      if (
        event.type === EVENT_TYPE_MESSAGE &&
        event.message?.type === "text" &&
        event.message.text
      ) {
        console.log(
          `[webhook] → handleMessage(${lineUserId}, "${event.message.text}")`
        );
        return handleMessage(lineUserId, event.message.text);
      }

      if (event.type === EVENT_TYPE_FOLLOW) {
        console.log(`[webhook] → handleFollow(${lineUserId})`);
        return handleFollow(lineUserId);
      }

      console.log(`[webhook] Ignoring event type: ${event.type}`);
    })
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[webhook] Event handler failed:", result.reason);
    }
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  console.log("[webhook] ← Incoming POST /api/line/webhook");

  // ── Read raw body FIRST — pitfall #2: HMAC must hash the raw string ──
  const rawBody = await request.text();

  // ── Validate signature ─────────────────────────────────────────
  const signature = request.headers.get("x-line-signature");
  if (!signature || !validateSignature(rawBody, signature)) {
    console.error("[webhook] ✗ Signature validation failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  console.log("[webhook] ✓ Signature valid");

  // ── Parse events ───────────────────────────────────────────────
  let body: LineWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events = body.events ?? [];
  console.log(`[webhook] Scheduling ${events.length} event(s) for background processing`);

  // ── Schedule background processing via after() ─────────────────
  // Returns 200 immediately so LINE doesn't retry, and the Claude API
  // call + DB writes + LINE push happen after the response is sent.
  // On Vercel, after() uses waitUntil under the hood — the function
  // stays alive beyond the response but isn't subject to the 10s timeout.
  after(processEvents(events));

  // LINE expects 200 OK regardless of processing outcome
  return NextResponse.json({ status: "ok" });
}
