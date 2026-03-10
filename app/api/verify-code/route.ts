// POST /api/verify-code — check that a code exists, is unused, and has not expired (read-only, does NOT consume)

import { NextRequest, NextResponse } from "next/server";
import { getCodeByValue } from "@/lib/db/code";
import type { ApiError } from "@/types/api";

interface VerifyCodeResponse {
  valid: boolean;
  reason?: "NOT_FOUND" | "USED" | "EXPIRED";
}

export async function POST(request: NextRequest) {
  // ── Parse & validate body ──────────────────────────────────────
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { code } = body;

  if (!code || typeof code !== "string") {
    return NextResponse.json<ApiError>(
      { error: "Missing required field: code" },
      { status: 400 }
    );
  }

  // ── Look up code ───────────────────────────────────────────────
  const record = await getCodeByValue(code.trim().toUpperCase());

  if (!record) {
    return NextResponse.json<VerifyCodeResponse>({
      valid: false,
      reason: "NOT_FOUND",
    });
  }

  if (record.used) {
    return NextResponse.json<VerifyCodeResponse>({
      valid: false,
      reason: "USED",
    });
  }

  if (record.expires_at < new Date()) {
    return NextResponse.json<VerifyCodeResponse>({
      valid: false,
      reason: "EXPIRED",
    });
  }

  return NextResponse.json<VerifyCodeResponse>({ valid: true });
}
