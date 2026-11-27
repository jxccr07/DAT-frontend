import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "@/i18n/types";
import { SESSION_COOKIE } from "@/lib/session";

/** Clears a stale/expired session cookie, then sends the user to login. */
export function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("lang") ?? "";
  const lang = hasLocale(raw) ? raw : "ar";
  // A relative Location: behind Nginx, request.url is Next's own address (localhost:3001), not the public domain.
  const response = new NextResponse(null, { status: 307, headers: { Location: `/${lang}/login?expired=1` } });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
