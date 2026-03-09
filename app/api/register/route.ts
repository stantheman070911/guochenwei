// POST /api/register — accepts name + email, creates User, generates ActivationCode, sends email via Resend
// TODO: implement full registration flow

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
