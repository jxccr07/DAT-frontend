import Link from "next/link";
import { ArrowLeftRight, BellRing, ChevronDown, Info, Plus, TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { format, type Dictionary, type Locale } from "@/i18n/types";
import { qty, type Units } from "@/i18n/plural";
import { Ltr, richFormat } from "@/components/rich-format";
import type { TwinComparison, TwinCourseRef, TwinDecision, TwinHeadline } from "@/lib/types";
import { ComparisonBars } from "./comparison-bars";
import { chancePct, cohortLine, pct, rangePct } from "./twin-format";
import { DotGrid } from "./dot-grid";
import { MeetingRequest } from "./meeting-request";

type Props = {
  decision: TwinDecision;
  locale: Locale;
  t: Dictionary["twin"];
  units: Units;
  onDropInstead?: (course: TwinCourseRef) => void;
  onAdd?: (course: TwinCourseRef) => void;
  disabled?: boolean;
  /** Opt-in consent to alert the advisor about this drop (only offered when the drop is costly). */
  notifyAdvisor?: boolean;
  onNotifyAdvisorChange?: (value: boolean) => void;
};

type Impact = "small" | "medium" | "large";

/** Effect size from the headline: points added to the chance of a semester's delay (plus extra hours for the general view). */
function impactOfHeadline(h: TwinHeadline, c: TwinComparison | null): Impact {
  const points = (h.delayed_with - h.delayed_without) * 100;
  const byPoints: Impact = points >= 15 ? "large" : points >= 5 ? "medium" : "small";
  if (h.source === "course" || !c) return byPoints;
  const byHours = impactOf(c);
  const order: Impact[] = ["small", "medium", "large"];
  return order[Math.max(order.indexOf(byPoints), order.indexOf(byHours))];
}

/** Effect size in plain words, from extra hours behind and the change in chance of a semester's delay. */
function impactOf(c: TwinComparison): Impact {
  const extra = c.gap_with - c.gap_without;
  const chance = c.delayed_with - c.delayed_without;
  if (extra >= 4.5 || chance >= 0.25) return "large";
  if (extra >= 1.5 || chance >= 0.1) return "medium";
  return "small";
}

const impactTone: Record<Impact, string> = {
  small: "bg-surface-2 text-muted",
  medium: "bg-warn-soft text-warn",
  large: "bg-bad-soft text-bad",
};

/**
 * "Price of the decision": one plain-language headline, one probability, then
 * details on demand. Rule-checked alternatives and, when it applies, a heads-up
 * that the advisor will be notified.
 */
export function DecisionCost({ decision: d, locale, t, units, onDropInstead, onAdd, disabled, notifyAdvisor = false, onNotifyAdvisorChange }: Props) {
  const c = d.comparison;
  const h = d.headline;
  const course = d.course_stats;
  const points = h ? Math.round((h.delayed_with - h.delayed_without) * 100) : 0;
  const impact = h ? impactOfHeadline(h, c) : null;

  // Only show the course line when it says something the general comparison doesn't.
  const courseAddsInfo =
    h?.source !== "course" &&
    d.action === "drop" &&
    course?.delayed_if_dropped != null &&
    course.delayed_if_kept != null &&
    (!c || Math.abs(course.delayed_if_dropped - c.delayed_with) >= 0.02 || Math.abs(course.delayed_if_kept - c.delayed_without) >= 0.02);

  // The other side of a drop: what keeping the course looked like for students like you (fail rate, typical grade).
  const keepSide = d.action === "drop" && course ? course : null;
  const failShare = keepSide ? Math.max(0, Math.min(1, 1 - keepSide.pass_rate)) : 0;
  const alternatives = keepSide ? d.alternatives.filter((a) => a.type !== "keep") : d.alternatives;

  const hasDetails = alternatives.length > 0 || !!h || !!keepSide || !!c || courseAddsInfo;
  const touch = "h-11 shrink-0 px-3 text-xs sm:h-9";

  // Summary first (headline, both sides at a glance, warnings, consent); the evidence and alternatives sit behind one disclosure.
  return (
    <div className="space-y-3">
      {h ? (
        <div className="space-y-3 rounded-md border border-line p-4">
          <div className="flex flex-wrap items-center gap-2">
            {keepSide && <span className="text-xs font-semibold text-muted">{t.sideDrop}</span>}
            {impact && (
              <span className={clsx("inline-flex rounded-sm px-2 py-0.5 text-xs font-semibold", impactTone[impact])}>{t.impact[impact]}</span>
            )}
          </div>
          <p className="text-base leading-snug font-semibold">
            {points >= 2 ? (
              <>
                {format(t.headlineUp[d.action], { a: chancePct(h.delayed_with, t), b: chancePct(h.delayed_without, t) })}{" "}
                <span className="text-sm font-medium text-muted">({format(t.headlineDiff, { d: qty(units, "points", points) })})</span>
              </>
            ) : (
              format(t.headlineFlat, {
                with: t.actionWith[d.action],
                without: t.actionWithout[d.action],
                a: chancePct(h.delayed_with, t),
                b: chancePct(h.delayed_without, t),
              })
            )}
          </p>

          <div>
            <p className="mb-2 text-xs font-medium text-muted">{t.per100}</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t.actionWith[d.action], share: h.delayed_with, accent: true },
                { label: t.actionWithout[d.action], share: h.delayed_without, accent: false },
              ].map((g) => {
                const text = format(t.per100Delayed, { n: Math.round(g.share * 100) });
                return (
                  <div key={g.label} className="space-y-1.5">
                    <p className="text-xs font-semibold">{g.label}</p>
                    <DotGrid share={g.share} label={`${g.label}: ${text}`} accent={g.accent} />
                    <p className="text-xs text-muted" aria-hidden>
                      {text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-md bg-surface-2 p-3 text-sm text-muted">{t.noData}</p>
      )}

      {keepSide && (
        <div className="space-y-2 rounded-md border border-line p-4">
          <p className="text-xs font-semibold text-muted">{t.sideKeep}</p>
          <div className="flex items-center gap-4">
            <DotGrid share={failShare} label={format(t.keepFailed, { n: Math.round(failShare * 100) })} accent />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{format(t.keepFailed, { n: Math.round(failShare * 100) })}</p>
              {keepSide.typical_letter && <p className="text-muted">{richFormat(t.keepLetter, { letter: <Ltr>{keepSide.typical_letter}</Ltr> })}</p>}
            </div>
          </div>
          {failShare >= 0.3 && (
            <p className="flex gap-2 rounded-md bg-warn-soft p-2.5 text-xs text-warn">
              <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
              {t.keepRisky}
            </p>
          )}
        </div>
      )}

      {d.light_after && (
        <p className="flex gap-2 rounded-md bg-warn-soft p-3 text-sm text-warn">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {format(t.lightAfter, { h: qty(units, "hours", d.hours_after), min: qty(units, "hours", d.min_hours) })}
        </p>
      )}

      {d.will_notify_advisor && onNotifyAdvisorChange && (
        <label className="flex min-h-11 cursor-pointer gap-3 rounded-md bg-info-soft p-3 text-sm text-info">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-current"
            checked={notifyAdvisor}
            onChange={(e) => onNotifyAdvisorChange(e.target.checked)}
          />
          <span className="space-y-0.5">
            <span className="flex items-center gap-1.5 font-semibold">
              <BellRing className="size-4 shrink-0" aria-hidden />
              {t.notifyAdvisor}
            </span>
            <span className="block text-xs opacity-85">{t.notifyAdvisorHint}</span>
          </span>
        </label>
      )}

      {d.action === "drop" && d.has_advisor && <MeetingRequest courseId={d.course?.id ?? null} locale={locale} t={t} className={touch} />}

      <p className="flex items-start gap-2 text-xs text-muted">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>{t.caveat}</span>
      </p>

      {hasDetails && (
        <details className="group rounded-md border border-line">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
            {alternatives.length > 0 ? format(t.showAlternatives, { n: alternatives.length }) : t.showDetails}
            <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="space-y-4 border-t border-line p-4">
            {alternatives.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className="marker" aria-hidden />
                  {t.alternatives}
                </h3>
                <ul className="space-y-2">
                  {alternatives.map((alt) => (
                    <li key={alt.type} className="flex flex-col gap-2 rounded-md bg-surface-2 p-3 text-sm sm:flex-row sm:items-center">
                      <span className="flex-1">
                        {alt.type === "keep" &&
                          (alt.typical_letter
                            ? richFormat(t.altKeep, { p: pct(alt.pass_rate), letter: <Ltr>{alt.typical_letter}</Ltr> })
                            : format(t.altKeepNoLetter, { p: pct(alt.pass_rate) }))}
                        {alt.type === "drop_instead" && format(t.altDropInstead, { course: alt.course.name, p: pct(alt.delayed) })}
                        {alt.type === "add_course" && addCourseText(alt, t, units)}
                      </span>
                      {alt.type === "drop_instead" && onDropInstead && (
                        <button type="button" className={clsx("btn-outline", touch)} disabled={disabled} onClick={() => onDropInstead(alt.course)}>
                          <ArrowLeftRight className="size-3.5" aria-hidden />
                          {richFormat(t.switchDrop, { code: <Ltr>{alt.course.code}</Ltr> })}
                        </button>
                      )}
                      {alt.type === "add_course" && onAdd && (
                        <button type="button" className={clsx("btn-outline", touch)} disabled={disabled} onClick={() => onAdd(alt.course)}>
                          <Plus className="size-3.5" aria-hidden />
                          {richFormat(t.addCourse, { code: <Ltr>{alt.course.code}</Ltr> })}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-1.5 text-xs text-muted">
              <p>{cohortLine(d.cohort, t)}</p>
              {h && (
                <p>
                  {h.source === "course"
                    ? format(t.sourceCourse, { a: qty(units, "students", h.n_with), b: qty(units, "students", h.n_without) })
                    : t.sourceGeneral}
                </p>
              )}
              {h?.range_with && h.range_without && (
                <p>
                  {richFormat(t.rangeNote, {
                    with: t.actionWith[d.action],
                    without: t.actionWithout[d.action],
                    a: <Ltr>{rangePct(h.range_with)}</Ltr>,
                    b: <Ltr>{rangePct(h.range_without)}</Ltr>,
                  })}
                </p>
              )}
              {keepSide && <p>{format(keepSide.band === "all" ? t.keepSourceAll : t.keepSource, { n: qty(units, "students", keepSide.n_taken) })}</p>}
            </div>

            {c && (
              <div>
                <h4 className="mb-2 text-xs font-semibold">{t.generalLabel}</h4>
                <ComparisonBars comparison={c} decision={d.action} units={units} t={t} />
              </div>
            )}
            {courseAddsInfo && course && (
              <div>
                <h4 className="mb-1 text-xs font-semibold">
                  {t.courseLabel}
                  <span className="font-normal text-muted"> · {format(t.courseSample, { n: qty(units, "students", course.n_dropped) })}</span>
                </h4>
                <p className="text-sm">
                  {format(t.courseSpecific, { a: pct(course.delayed_if_dropped!), b: pct(course.delayed_if_kept!) })}
                </p>
              </div>
            )}

            <Link href={`/${locale}/twin`} className="inline-flex min-h-11 items-center text-xs font-medium text-brand underline-offset-2 hover:underline sm:min-h-0">
              {t.how}
            </Link>
          </div>
        </details>
      )}
    </div>
  );
}

function addCourseText(alt: Extract<TwinDecision["alternatives"][number], { type: "add_course" }>, t: Dictionary["twin"], units: Units) {
  const p = alt.pass_rate != null ? pct(alt.pass_rate) : null;
  if (alt.is_retake && p) return format(t.altRetake, { course: alt.course.name, p });
  if (alt.reaches_min) return p ? format(t.altAdd, { course: alt.course.name, p }) : format(t.altAddNoRate, { course: alt.course.name });
  const short = qty(units, "hours", alt.shortfall_after);
  return p ? format(t.altAddPartial, { course: alt.course.name, short, p }) : format(t.altAddPartialNoRate, { course: alt.course.name, short });
}
