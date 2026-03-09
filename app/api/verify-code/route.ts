// POST /api/verify-code — checks that a code exists in DB, is unused, and has not expired
// TODO: implement code verification

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
