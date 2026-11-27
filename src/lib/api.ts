import "server-only";

/**
 * Thin server-side client for the Laravel API.
 * The browser never talks to Laravel directly and never sees the token.
 */
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  token?: string;
  locale?: string;
  /** Real client IP, forwarded so Laravel's rate limiter works per user. */
  clientIp?: string;
  /** Return the whole JSON body (e.g. `{ data, meta }` for paginated lists) instead of just `data`. */
  raw?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Language": options.locale ?? "ar",
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.clientIp) headers["X-Forwarded-For"] = options.clientIp;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ApiError(0, "network", "API unreachable");
  }

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    message?: string;
    code?: string;
    errors?: Record<string, string[]>;
  };

  if (!response.ok) {
    const code =
      payload.code ??
      (response.status === 429
        ? "too_many_requests"
        : response.status === 422 && payload.errors
          ? "validation"
          : response.status === 401
            ? "unauthenticated"
            : response.status === 403
              ? "forbidden"
              : "unknown");
    throw new ApiError(response.status, code, payload.message ?? response.statusText);
  }

  return (options.raw ? payload : payload.data) as T;
}
