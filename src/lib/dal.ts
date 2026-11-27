import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getLocale } from "@/i18n";
import { ApiError, apiRequest } from "./api";
import { getClientIp, getSessionToken } from "./session";
import type {
  AdvisorOverview,
  AdvisorStudentFile,
  AdvisorStudentRow,
  DeadlineList,
  Grades,
  Me,
  MessageThread,
  Paginated,
  Plan,
  Registration,
  Schedule,
  TwinDecision,
  TwinMeta,
  TwinStatus,
  TwinTimeline,
} from "./types";

/**
 * Data Access Layer: every authenticated read goes through here.
 * Reads the session cookie on the server, calls Laravel with the bearer token,
 * and sends the user back to login when the token is missing or expired.
 */
async function authed<T>(path: string, raw = false): Promise<T> {
  const locale = await getLocale();
  const token = await getSessionToken();
  if (!token) redirect(`/${locale}/login`);

  try {
    return await apiRequest<T>(path, { token, locale, clientIp: await getClientIp(), raw });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Route handler clears the stale cookie, then redirects to login.
      redirect(`/api/session/expired?lang=${locale}`);
    }
    throw error;
  }
}

// React `cache` dedupes calls within a single render (layout + page share one request).
export const getMe = cache(() => authed<Me>("/me"));
export const getGrades = cache(() => authed<Grades>("/me/academic/grades"));
export const getPlan = cache(() => authed<Plan | null>("/me/academic/plan"));
export const getSchedule = cache(() => authed<Schedule>("/me/schedule"));
export const getRegistration = cache(() => authed<Registration>("/me/registration"));
export const getTwin = cache(() => authed<TwinStatus>("/me/twin"));
export const getTwinMeta = cache(() => authed<TwinMeta | null>("/me/twin/meta"));
export const getTwinTimeline = cache(() => authed<TwinTimeline | null>("/me/twin/timeline"));
export const getLightLoadDecision = cache(() => authed<TwinDecision | null>("/me/twin/decision?action=light"));

/* advising */
export const getAdvisorOverview = cache(() => authed<AdvisorOverview>("/me/advisor"));
export const getBeforeDeadline = cache(() => authed<DeadlineList>("/me/advisor/before-deadline"));
export const getAdvisorStudents = cache((filter: string, q: string, page: number) =>
  authed<Paginated<AdvisorStudentRow>>(
    `/me/advisor/students?${new URLSearchParams({ filter, q, page: String(page) }).toString()}`,
    true,
  ),
);
export const getAdvisorStudent = cache((id: number) => authed<AdvisorStudentFile>(`/me/advisor/students/${id}`));

/** Send each role to its own home: students never see advisor pages and vice versa. */
/** Where each kind of account lands after signing in. */
export const homeOf = (role: Me["role"]) => (role === "advisor" ? "advisor" : "dashboard");

export async function requireRole(role: Me["role"]) {
  const me = await getMe();
  if (me.role !== role) redirect(`/${await getLocale()}/${homeOf(me.role)}`);
  return me;
}

/* messages (student side) */
export const getMessages = cache(() => authed<MessageThread>("/me/messages"));
