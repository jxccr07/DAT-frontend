import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale } from "@/i18n/types";

const SESSION_COOKIE = "dat_session";
// Renamed from "dat_locale": the old cookie was often set from the browser language, not by the visitor.
const LOCALE_COOKIE = "dat_lang";
const PUBLIC_PAGES = new Set(["login", "advisor-login", "terms"]);

function preferredLocale(request: NextRequest) {
  // A language the visitor picked before wins; otherwise the site opens in Arabic.
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  return saved && hasLocale(saved) ? saved : defaultLocale;
}

/**
 * 1) Ensures every page URL has a locale prefix (/ar/..., /en/...).
 * 2) Optimistic auth gate based on the session cookie's presence.
 *    Real authorization happens server-side in the DAL and in Laravel.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, first, page] = pathname.split("/");

  if (!first || !hasLocale(first)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PAGES.has(page ?? "");

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL(`/${first}/login`, request.url));
  }
  if (hasSession && (isPublic || !page)) {
    return NextResponse.redirect(new URL(`/${first}/dashboard`, request.url));
  }

  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return response;
}

export const config = {
  // Skip API routes, Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
