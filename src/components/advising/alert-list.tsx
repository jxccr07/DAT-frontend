"use client";

import Link from "next/link";
import { parseApiDate } from "@/lib/format";
import { useTransition } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import { markAlertSeenAction } from "@/lib/actions";
import { format, type Dictionary, type Locale } from "@/i18n/types";
import { qty, type Units } from "@/i18n/plural";
import { useToast } from "@/components/ui/toast";
import { pct } from "@/components/twin/twin-format";
import type { AdvisorAlert } from "@/lib/types";

type Props = {
  alerts: AdvisorAlert[];
  locale: Locale;
  t: Dictionary["advisor"];
  errors: Dictionary["errors"];
  units: Units;
  showStudent?: boolean;
  /** Empty-state text; defaults to the advisor-wide one. */
  emptyText?: string;
};

/** Costly decisions students went ahead with, newest unseen first, with the numbers they were shown. */
export function AlertList({ alerts, locale, t, errors, units, showStudent = true, emptyText }: Props) {
  if (alerts.length === 0) return <p className="p-5 text-sm text-muted">{emptyText ?? t.alertsEmpty}</p>;

  return (
    <ul className="divide-y divide-line">
      {alerts.map((alert) => (
        <AlertRow key={alert.id} alert={alert} locale={locale} t={t} errors={errors} units={units} showStudent={showStudent} />
      ))}
    </ul>
  );
}

function AlertRow({ alert, locale, t, errors, units, showStudent }: { alert: AdvisorAlert } & Omit<Props, "alerts">) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const d = alert.details;
  const unseen = alert.seen_at === null;
  const when = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parseApiDate(alert.created_at));

  const markSeen = () =>
    start(async () => {
      const result = await markAlertSeenAction(alert.id, locale);
      if (!result.ok) toast("error", (errors as Record<string, string>)[result.code] ?? errors.unknown);
    });

  return (
    <li className={clsx("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start", !unseen && "opacity-65")}>
      <span
        className={clsx("grid size-8 shrink-0 place-items-center rounded-md", unseen ? "bg-bad-soft text-bad" : "bg-surface-2 text-muted")}
        aria-hidden
      >
        <BellRing className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm">
          {showStudent && (
            <Link href={`/${locale}/advisor/students/${alert.student.id}`} className="font-semibold text-fg hover:text-brand hover:underline">
              <span dir="auto">{alert.student.full_name}</span>
            </Link>
          )}
          {showStudent && <span className="text-muted"> · </span>}
          <span className="font-medium">
            {alert.type === "meeting_request"
              ? alert.course
                ? format(t.alertRequest, { course: alert.course.name })
                : t.alertRequestNoCourse
              : format(t.alertDrop, { course: alert.course?.name ?? "—" })}
          </span>
        </p>
        {d && (
          <ul className="space-y-0.5 text-xs text-muted">
            {/* Lead with the same headline the student saw; older alerts fall back to the extra hours. */}
            {d.headline ? (
              <li>
                {format(d.headline.source === "course" ? t.alertHeadline : t.alertHeadlineGeneral, {
                  a: d.headline.delayed_with >= 0.955 ? t.riskOver : pct(d.headline.delayed_with),
                  b: d.headline.delayed_without >= 0.955 ? t.riskOver : pct(d.headline.delayed_without),
                })}
              </li>
            ) : (
              d.extra_hours >= 0.5 && <li>{format(t.alertExtra, { h: qty(units, "hours", d.extra_hours) })}</li>
            )}
            {d.below_min && <li className="text-warn">{format(t.alertBelowMin, { h: qty(units, "hours", d.hours_after), min: qty(units, "hours", d.min_hours) })}</li>}
          </ul>
        )}
        <p className="text-xs text-muted">{when}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {unseen ? (
          <button type="button" className="btn-outline h-11 sm:h-8 px-3 text-xs" onClick={markSeen} disabled={pending}>
            {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
            {t.markSeen}
          </button>
        ) : (
          <span className="inline-flex h-11 sm:h-8 items-center gap-1 text-xs text-muted">
            <Check className="size-3.5" aria-hidden />
            {t.seen}
          </span>
        )}
      </div>
    </li>
  );
}
