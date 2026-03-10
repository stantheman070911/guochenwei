// POST /api/register — validate body → create user → generate code → send email → return code

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createUser, getUserByEmail } from "@/lib/db/user";
import { createCode } from "@/lib/db/code";
import { generateCode } from "@/lib/auth/generate-code";
import { sendActivationEmail } from "@/lib/email/send-activation";
import { DEFAULT_CODE_TTL_HOURS } from "@/constants/auth";
import type { RegisterRequest, RegisterResponse, ApiError } from "@/types/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  // ── Parse & validate body ──────────────────────────────────────
  let body: RegisterRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { email, name } = body;

  if (!email || typeof email !== "string" || !name || typeof name !== "string") {
    return NextResponse.json<ApiError>(
      { error: "Missing required fields: email, name" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = name.trim();

  if (!trimmedName) {
    return NextResponse.json<ApiError>(
      { error: "Name cannot be empty" },
      { status: 400 }
    );
  }

  if (trimmedName.length > 50) {
    return NextResponse.json<ApiError>(
      { error: "Name cannot exceed 50 characters" },
      { status: 400 }
    );
  }

  if (normalizedEmail.length > 255) {
    return NextResponse.json<ApiError>(
      { error: "Email cannot exceed 255 characters" },
      { status: 400 }
    );
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return NextResponse.json<ApiError>(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  // ── Check existing user ────────────────────────────────────────
  const existingUser = await getUserByEmail(normalizedEmail);

  if (existingUser?.status === "ACTIVE") {
    return NextResponse.json<ApiError>(
      { error: "This email is already registered and activated" },
      { status: 409 }
    );
  }

  // ── Create user or reuse pending ───────────────────────────────
  let userId: string;

  if (existingUser) {
    // PENDING user re-registering — reuse record, issue new code
    userId = existingUser.id;
  } else {
    try {
      const user = await createUser({
        email: normalizedEmail,
        name: trimmedName,
      });
      userId = user.id;
    } catch (err) {
      // Race condition: another request created the same email between check and insert
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json<ApiError>(
          { error: "This email is already registered" },
          { status: 409 }
        );
      }
      throw err;
    }
  }

  // ── Generate & persist activation code ─────────────────────────
  const code = generateCode();
  const ttlHours =
    Number(process.env.ACTIVATION_CODE_TTL_HOURS) || DEFAULT_CODE_TTL_HOURS;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  await createCode({ code, userId, expiresAt });

  // ── Send email (best-effort — code is also shown on screen) ────
  const emailResult = await sendActivationEmail({
    email: normalizedEmail,
    name: trimmedName,
    code,
  });

  if (!emailResult.success) {
    console.error("[/api/register] Email send failed:", emailResult.error);
  }

  // ── Set session cookie so /dashboard can identify the user ────
  const response = NextResponse.json<RegisterResponse>(
    { activationCode: code },
    { status: 201 }
  );

  response.cookies.set("userId", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}
