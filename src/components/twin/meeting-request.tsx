"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarCheck, Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import { requestMeetingAction } from "@/lib/actions";
import type { Dictionary, Locale } from "@/i18n/types";

/**
 * "Ask my advisor for a meeting" from the drop screen. The student's own choice is what puts
 * them on the advisor's before-the-deadline list (viewing this screen alone never does).
 */
export function MeetingRequest({ courseId, locale, t, className }: { courseId: number | null; locale: Locale; t: Dictionary["twin"]; className: string }) {
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [pending, start] = useTransition();

  const ask = () =>
    start(async () => {
      const result = await requestMeetingAction(courseId, locale);
      setState(result.ok ? "sent" : "error");
    });

  if (state === "sent") {
    return (
      <p className="flex items-center gap-2 rounded-md bg-ok-soft p-3 text-sm text-ok" role="status">
        <Check className="size-4 shrink-0" aria-hidden />
        <span className="flex-1">{t.meetingRequested}</span>
        <Link href={`/${locale}/messages`} className="text-xs font-medium underline-offset-2 hover:underline">
          {t.askAdvisor}
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
      <span className={clsx("flex-1", state === "error" ? "text-bad" : "text-muted")}>{t.requestMeetingHint}</span>
      <button type="button" className={clsx("btn-outline", className)} onClick={ask} disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <CalendarCheck className="size-3.5" aria-hidden />}
        {t.requestMeeting}
      </button>
    </div>
  );
}
