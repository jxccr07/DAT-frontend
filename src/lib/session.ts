import "server-only";
import { cookies, headers } from "next/headers";

export const SESSION_COOKIE = "dat_session";

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Store the Sanctum token in an httpOnly cookie: invisible to JavaScript (XSS-safe). */
export async function setSessionToken(token: string, expiresAt: string | null) {
  const maxAge = expiresAt
    ? Math.max(60, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    : 60 * 60 * 8;

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * The visitor's IP for rate limiting. Never trust the first X-Forwarded-For entry: the visitor
 * writes it. Prefer X-Real-IP (Nginx sets it to $remote_addr, overwriting any client value),
 * else the last X-Forwarded-For entry (the one our own proxy appended).
 */
export async function getClientIp(): Promise<string | undefined> {
  const h = await headers();
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  return h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || undefined;
}
