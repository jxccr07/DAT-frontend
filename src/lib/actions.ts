"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { hasLocale, type Locale } from "@/i18n/types";
import { ApiError, apiRequest } from "./api";
import { clearSession, getClientIp, getSessionToken, setSessionToken } from "./session";
import type { ActionResult, TwinDecision } from "./types";

const localeOf = (value: unknown): Locale =>
  typeof value === "string" && hasLocale(value) ? value : "ar";

const codeOf = (error: unknown) => (error instanceof ApiError ? error.code : "unknown");

/* ---------------------------------- auth --------------------------------- */

const loginSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(1).max(255),
  portal: z.enum(["student", "advisor"]),
});

export type LoginState = { error?: string; email?: string } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const locale = localeOf(formData.get("lang"));
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: formData.get("password"),
    portal: formData.get("portal") === "advisor" ? "advisor" : "student",
  });
  if (!parsed.success) return { error: "validation", email: String(formData.get("email") ?? "") };

  try {
    const data = await apiRequest<{ access_token: string; expires_at: string | null }>("/me/login", {
      method: "POST",
      body: parsed.data,
      locale,
      clientIp: await getClientIp(),
    });
    await setSessionToken(data.access_token, data.expires_at);
  } catch (error) {
    return { error: codeOf(error), email: parsed.data.email };
  }

  redirect(`/${locale}/${parsed.data.portal === "advisor" ? "advisor" : "dashboard"}`);
}

/** Demo student whose advisor already has alerts (the full student → advisor loop). */
export async function demoStudentAction(
  locale: string,
  persona: "struggling" | "on_track" = "struggling",
): Promise<ActionResult<{ email: string; password: string }>> {
  try {
    const data = await apiRequest<{ email: string; password: string }>(persona === "on_track" ? "/demo-student?persona=on_track" : "/demo-student", {
      locale: localeOf(locale),
      clientIp: await getClientIp(),
    });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, code: codeOf(error) };
  }
}

export async function demoAdvisorAction(locale: string): Promise<ActionResult<{ email: string; password: string }>> {
  try {
    const data = await apiRequest<{ email: string; password: string }>("/demo-advisor", {
      locale: localeOf(locale),
      clientIp: await getClientIp(),
    });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, code: codeOf(error) };
  }
}

/**
 * Ends the session and returns where to go. The client then does a full page load
 * (not a client-side redirect): the router keeps previously visited pages alive in
 * memory, and on a shared computer the next person must not find them there.
 */
export async function logoutAction(formData: FormData): Promise<{ to: string }> {
  const locale = localeOf(formData.get("lang"));
  const loginPage = formData.get("portal") === "advisor" ? "advisor-login" : "login";
  const token = await getSessionToken();
  if (token) {
    // Revoke server-side too; ignore failures (token may already be expired).
    await apiRequest("/me/logout", { method: "POST", token, locale }).catch(() => undefined);
  }
  await clearSession();
  return { to: `/${locale}/${loginPage}` };
}

/* ------------------------------ registration ----------------------------- */

const courseIdSchema = z.number().int().positive();

async function mutateCourse(method: "POST" | "DELETE", courseId: number, locale: string, notifyAdvisor = false): Promise<ActionResult> {
  // Re-verify the session inside every action: never trust the client.
  const token = await getSessionToken();
  if (!token) return { ok: false, code: "unauthenticated" };

  const id = courseIdSchema.safeParse(courseId);
  if (!id.success) return { ok: false, code: "validation" };

  try {
    await apiRequest(method === "POST" ? "/me/registration/courses" : `/me/registration/courses/${id.data}${notifyAdvisor === true ? "?notify_advisor=1" : ""}`, {
      method,
      body: method === "POST" ? { course_id: id.data } : undefined,
      token,
      locale: localeOf(locale),
      clientIp: await getClientIp(),
    });
  } catch (error) {
    return { ok: false, code: codeOf(error) };
  }

  refresh();
  return { ok: true };
}

export async function registerCourseAction(courseId: number, locale: string) {
  return mutateCourse("POST", courseId, locale);
}

/** Drops a course; the advisor is alerted only when the student opted in. */
export async function dropCourseAction(courseId: number, locale: string, notifyAdvisor = false) {
  return mutateCourse("DELETE", courseId, locale, notifyAdvisor);
}

/* --------------------------------- twin ---------------------------------- */

/** "Price of the decision" preview, read before the student confirms a drop. */
export async function decisionPreviewAction(
  action: "drop" | "fail",
  courseId: number,
  locale: string,
): Promise<ActionResult<TwinDecision | null>> {
  const token = await getSessionToken();
  if (!token) return { ok: false, code: "unauthenticated" };

  const id = courseIdSchema.safeParse(courseId);
  if (!id.success || !["drop", "fail"].includes(action)) return { ok: false, code: "validation" };

  try {
    const data = await apiRequest<TwinDecision | null>(`/me/twin/decision?action=${action}&course=${id.data}`, {
      token,
      locale: localeOf(locale),
      clientIp: await getClientIp(),
    });
    return { ok: true, data };
  } catch (error) {
    return { ok: false, code: codeOf(error) };
  }
}

/* ------------------------------- advising -------------------------------- */

const noteSchema = z.object({
  studentId: z.number().int().positive(),
  body: z.string().trim().min(1).max(2000),
  contacted: z.boolean(),
});

export async function addNoteAction(input: { studentId: number; body: string; contacted: boolean }, locale: string): Promise<ActionResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, code: "unauthenticated" };
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "validation" };

  try {
    await apiRequest(`/me/advisor/students/${parsed.data.studentId}/notes`, {
      method: "POST",
      body: { body: parsed.data.body, contacted: parsed.data.contacted },
      token,
      locale: localeOf(locale),
      clientIp: await getClientIp(),
    });
  } catch (error) {
    return { ok: false, code: codeOf(error) };
  }
  refresh();
  return { ok: true };
}

export async function markAlertSeenAction(alertId: number, locale: string): Promise<ActionResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, code: "unauthenticated" };
  const id = courseIdSchema.safeParse(alertId);
  if (!id.success) return { ok: false, code: "validation" };

  try {
    await apiRequest(`/me/advisor/alerts/${id.data}/seen`, { method: "POST", token, locale: localeOf(locale), clientIp: await getClientIp() });
  } catch (error) {
    return { ok: false, code: codeOf(error) };
  }
  refresh();
  return { ok: true };
}

/** Student → their advisor: "I'd like to talk about this course before I decide" (their choice). */
export async function requestMeetingAction(courseId: number | null, locale: string): Promise<ActionResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, code: "unauthenticated" };
  const id = courseId === null ? null : courseIdSchema.safeParse(courseId);
  if (id && !id.success) return { ok: false, code: "validation" };

  try {
    await apiRequest("/me/advisor-request", {
      method: "POST",
      body: { course: id ? id.data : null },
      token,
      locale: localeOf(locale),
      clientIp: await getClientIp(),
    });
  } catch (error) {
    return { ok: false, code: codeOf(error) };
  }
  return { ok: true };
}

/* ------------------------------- messages -------------------------------- */

const messageBody = z.string().trim().min(1).max(2000);

/** Advisor → one of their students, inside the portal (counts as contact, closes alerts). */
export async function sendAdvisorMessageAction(
  input: { studentId: number; body: string; alertId?: number },
  locale: string,
): Promise<ActionResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, code: "unauthenticated" };
  const body = messageBody.safeParse(input.body);
  const id = courseIdSchema.safeParse(input.studentId);
  if (!body.success || !id.success) return { ok: false, code: "validation" };

  try {
    await apiRequest(`/me/advisor/students/${id.data}/messages`, {
      method: "POST",
      body: { body: body.data, alert_id: input.alertId ?? null },
      token,
      locale: localeOf(locale),
      clientIp: await getClientIp(),
    });
  } catch (error) {
    return { ok: false, code: codeOf(error) };
  }
  refresh();
  return { ok: true };
}

/** Student → their advisor. */
export async function sendStudentMessageAction(input: { body: string }, locale: string): Promise<ActionResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, code: "unauthenticated" };
  const body = messageBody.safeParse(input.body);
  if (!body.success) return { ok: false, code: "validation" };

  try {
    await apiRequest("/me/messages", {
      method: "POST",
      body: { body: body.data },
      token,
      locale: localeOf(locale),
      clientIp: await getClientIp(),
    });
  } catch (error) {
    return { ok: false, code: codeOf(error) };
  }
  refresh();
  return { ok: true };
}
