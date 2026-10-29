import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "./lib/session";

// Only checks that the session cookie is genuine and unexpired.
// Pages then confirm the person is still a member and read their role from the database.
export async function middleware(req: NextRequest) {
  if (await readSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!login|go|invite|api/auth|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
