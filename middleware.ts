// Next.js middleware — protects /dashboard routes, redirects unauthenticated users to /
// TODO: implement auth guard when dashboard pages are built

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
