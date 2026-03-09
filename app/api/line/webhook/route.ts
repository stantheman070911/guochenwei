// POST /api/line/webhook — validates LINE signature, parses events, dispatches to message/follow handlers
// TODO: implement webhook handler

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
