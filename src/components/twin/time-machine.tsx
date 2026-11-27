"use client";

import { useId, useMemo, useState } from "react";
import { GraduationCap, Info, RotateCcw, Sun } from "lucide-react";
import clsx from "clsx";
import { format, type Dictionary } from "@/i18n/types";
import { qty, type Units } from "@/i18n/plural";
import type { TwinComparison, TwinTimeline } from "@/lib/types";
import { chancePct } from "./twin-format";

type Choice = "pass" | "fail" | "drop";
type T = Dictionary["twin"];
type Term = TwinTimeline["terms"][number];

export type RoadStop = { term: Term | null; summer: boolean; hours: number };

/** Hours this term's courses add to the record, given what the student chose for each. */
function passedNow(data: TwinTimeline, choices: Record<number, Choice>) {
  return data.registered.reduce((sum, c) => sum + ((choices[c.id] ?? "pass") === "pass" ? c.hours : 0), 0);
}

/** Hours per main term needed to finish within the plan (before any cap). */
function neededPace(data: TwinTimeline, left: number) {
  const termsAfterThis = data.plan_terms_left - 1;
  return termsAfterThis > 0 ? Math.ceil(left / termsAfterThis) : null;
}

/**
 * Term by term, the way a student actually finishes: this term's results, then each
 * main term at the chosen load and, if chosen, each summer at the summer cap.
 * Failed and dropped courses stay in what is left (they have to be taken again).
 */
export function projectGraduation(data: TwinTimeline, choices: Record<number, Choice>, load: number, summers: boolean) {
  let left = Math.max(0, data.remaining_hours - passedNow(data, choices));
  const startLeft = left;
  const road: RoadStop[] = [{ term: data.terms[0] ?? null, summer: false, hours: 0 }];
  let mainIndex = 0;

  while (left > 0 && road.length < 80) {
    const current = data.terms[mainIndex];
    // A summer follows the second term of each year.
    if (summers && current?.semester === "second") {
      const take = Math.min(left, data.limits.summer_max_hours);
      left -= take;
      road.push({ term: { academic_year: current.academic_year, semester: "summer" }, summer: true, hours: take });
      if (left <= 0) break;
    }
    mainIndex++;
    const take = Math.min(left, Math.max(1, load));
    left -= take;
    road.push({ term: data.terms[mainIndex] ?? null, summer: false, hours: take });
  }

  // Delay = main terms used beyond what the plan allows (graduating in a summer costs no main term).
  const mainTermsUsed = road.filter((stop) => !stop.summer).length;
  return { road, left: startLeft, delay: mainTermsUsed - data.plan_terms_left };
}

export function TimeMachine({ data, t: twin, units }: { data: TwinTimeline; t: T; units: Units }) {
  const t = twin.machine;
  const id = useId();
  const { min_hours: min, max_hours: max } = data.limits;

  // Default: the pace the plan needs (within the registration limits), so a student on track starts "on time".
  const baseLeft = Math.max(0, data.remaining_hours - data.registered_hours);
  const basePace = neededPace(data, baseLeft);
  const baseLoad = Math.min(max, Math.max(min, basePace ?? max));

  const [choices, setChoices] = useState<Record<number, Choice>>({});
  const [load, setLoad] = useState(baseLoad);
  const [summers, setSummers] = useState(false);

  const base = useMemo(() => projectGraduation(data, {}, baseLoad, false), [data, baseLoad]);
  const now = useMemo(() => projectGraduation(data, choices, load, summers), [data, choices, load, summers]);
  const changed = now.delay - base.delay;
  const touched = summers || load !== baseLoad || Object.values(choices).some((c) => c !== "pass");

  // What it would take to finish on time with the choices on screen.
  const pace = neededPace(data, now.left);
  const hoursThisTerm = data.registered.reduce((sum, c) => sum + ((choices[c.id] ?? "pass") === "drop" ? 0 : c.hours), 0);

  const label = (stop: RoadStop, k: number) =>
    stop.term ? `${t.semester[stop.term.semester]} ${stop.term.academic_year}` : format(t.afterTerms, { n: qty(units, "terms", k) });
  const grad = now.road[now.road.length - 1];

  // Show the plan's remaining terms too when the student finishes early.
  const planEnd = data.plan_terms_left - 1;
  const spare = Math.max(0, planEnd - (now.road.filter((s) => !s.summer).length - 1));
  let mainNo = 0;

  const evidence = buildEvidence(data, choices, hoursThisTerm, twin, t);

  return (
    <section className="card overflow-hidden" aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3.5 sm:px-5">
        <h2 id={`${id}-title`} className="flex items-center gap-2.5 font-semibold">
          <span className="marker" aria-hidden />
          {t.title}
        </h2>
        {touched && (
          <button
            type="button"
            className="btn-ghost h-11 px-3 text-xs sm:h-8"
            onClick={() => {
              setChoices({});
              setLoad(baseLoad);
              setSummers(false);
            }}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            {t.reset}
          </button>
        )}
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_1.1fr]">
        {/* Result: where the choices lead */}
        <div className="space-y-4 border-b border-line p-5 sm:p-6 lg:border-e lg:border-b-0" aria-live="polite">
          <p className="text-sm text-muted">{t.intro}</p>

          <div>
            <p className="text-xs font-medium text-muted">{t.graduate}</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
              <GraduationCap className="size-6 shrink-0 text-brand" aria-hidden />
              <bdi>{label(grad, now.road.length - 1)}</bdi>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={clsx("inline-flex rounded-sm px-2 py-0.5 text-xs font-semibold", now.delay > 0 ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok")}>
                {now.delay > 0
                  ? format(t.late, { n: qty(units, "terms", now.delay) })
                  : now.delay < 0
                    ? format(t.early, { n: qty(units, "terms", -now.delay) })
                    : t.onTime}
              </span>
              {changed !== 0 && (
                <span className={clsx("inline-flex rounded-sm px-2 py-0.5 text-xs font-semibold", changed > 0 ? "bg-bad-soft text-bad" : "bg-ok-soft text-ok")}>
                  {format(changed > 0 ? t.costs : t.saves, { n: qty(units, "terms", Math.abs(changed)) })}
                </span>
              )}
            </div>
          </div>

          {/* One square per term on the way: plan terms, extra terms, summers, graduation */}
          <div>
            <ol className="flex flex-wrap items-end gap-1.5" aria-label={t.roadLabel}>
              {now.road.map((stop, k) => {
                if (!stop.summer) mainNo++;
                const isGrad = k === now.road.length - 1;
                const beyond = !stop.summer ? mainNo - 1 > planEnd : mainNo - 1 >= planEnd;
                return (
                  <li
                    key={k}
                    title={`${label(stop, k)}${stop.hours ? ` · ${qty(units, "hours", stop.hours)}` : ""}`}
                    aria-label={`${label(stop, k)}${isGrad ? ` · ${t.graduate}` : ""}`}
                    className={clsx(
                      "grid place-items-center rounded-[4px] text-[11px] font-semibold transition-colors",
                      stop.summer ? "h-8 w-6" : "size-8",
                      isGrad
                        ? "bg-brand text-brand-fg"
                        : stop.summer
                          ? "bg-info-soft text-info ring-1 ring-info/30 ring-inset"
                          : beyond
                            ? "bg-warn text-white dark:text-bg"
                            : "bg-navy text-navy-fg dark:bg-brand/40 dark:text-fg",
                    )}
                  >
                    {isGrad ? (
                      <GraduationCap className="size-4" aria-hidden />
                    ) : stop.summer ? (
                      <Sun className="size-3.5" aria-hidden />
                    ) : k === 0 ? (
                      t.nowShort
                    ) : (
                      mainNo
                    )}
                  </li>
                );
              })}
              {Array.from({ length: spare }, (_, i) => (
                <li key={`spare-${i}`} className="size-8 rounded-[4px] bg-surface-2 ring-1 ring-line ring-inset" aria-hidden />
              ))}
            </ol>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
              <Legend className="bg-navy dark:bg-brand/40">{t.legendPlan}</Legend>
              {now.delay > 0 && <Legend className="bg-warn">{t.legendExtra}</Legend>}
              {summers && <Legend className="bg-info-soft ring-1 ring-info/30 ring-inset">{t.legendSummer}</Legend>}
              {spare > 0 && <Legend className="bg-surface-2 ring-1 ring-line ring-inset">{t.legendSpare}</Legend>}
            </p>
          </div>

          {evidence.length > 0 && (
            <ul className="space-y-2 rounded-md bg-surface-2 p-3 text-sm">
              {evidence.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-[2px] bg-brand" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Controls: what if... */}
        <div className="space-y-5 p-5 sm:p-6">
          {data.registered.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t.thisTerm}</legend>
              <ul className="space-y-2">
                {data.registered.map((course) => {
                  const value = choices[course.id] ?? "pass";
                  return (
                    <li key={course.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="min-w-0 text-sm">
                        <span dir="auto" className="block truncate font-medium">
                          {course.name}
                        </span>
                        <span className="text-xs text-muted" dir="ltr">
                          {course.code} · {course.hours}h
                        </span>
                      </span>
                      <div role="radiogroup" aria-label={course.name} className="grid shrink-0 grid-cols-3 gap-1 rounded-md bg-surface-2 p-1">
                        {(["pass", "fail", "drop"] as const).map((c) => (
                          <button
                            key={c}
                            type="button"
                            role="radio"
                            aria-checked={value === c}
                            onClick={() => setChoices((prev) => ({ ...prev, [course.id]: c }))}
                            className={clsx(
                              "min-h-10 rounded-[6px] px-3 text-xs font-medium whitespace-nowrap transition sm:min-h-8",
                              value === c
                                ? c === "pass"
                                  ? "bg-surface text-ok shadow-sm"
                                  : c === "fail"
                                    ? "bg-surface text-bad shadow-sm"
                                    : "bg-surface text-warn shadow-sm"
                                : "text-muted hover:text-fg",
                            )}
                          >
                            {t.choice[c]}
                          </button>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          )}

          <div>
            <label htmlFor={`${id}-load`} className="flex items-baseline justify-between gap-2 text-sm font-semibold">
              {t.loadLabel}
              <span className="text-lg font-bold">{qty(units, "hours", load)}</span>
            </label>
            {/* Registration limits apply to every term: no slider value a student couldn't actually register */}
            <input
              id={`${id}-load`}
              type="range"
              min={min}
              max={max}
              step={1}
              value={load}
              onChange={(e) => setLoad(Number(e.target.value))}
              className="mt-3 h-11 w-full cursor-pointer accent-[var(--color-brand)]"
              aria-valuetext={qty(units, "hours", load)}
            />
            <div className="flex justify-between text-[11px] text-muted" aria-hidden>
              <span>{min}</span>
              <span>{max}</span>
            </div>
            {pace != null && (
              <p className={clsx("mt-2 text-xs", pace > max && now.delay > 0 ? "text-warn" : "text-muted")}>
                {pace <= Math.max(min, 0)
                  ? format(t.paceEasy, { n: qty(units, "hours", min) })
                  : pace <= max
                    ? format(t.pace, { n: qty(units, "hours", pace) })
                    : summers
                      ? now.delay <= 0
                        ? t.paceSummerOk
                        : format(t.paceOver, { n: qty(units, "hours", max) })
                      : format(t.paceOverSummer, { n: qty(units, "hours", max) })}
              </p>
            )}
          </div>

          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md bg-surface-2 p-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]" checked={summers} onChange={(e) => setSummers(e.target.checked)} />
            <span>
              <span className="flex items-center gap-1.5 font-semibold">
                <Sun className="size-4 shrink-0 text-info" aria-hidden />
                {t.summers}
              </span>
              <span className="block text-xs text-muted">{format(t.summersHint, { n: qty(units, "hours", data.limits.summer_max_hours) })}</span>
            </span>
          </label>

          <p className="flex items-start gap-2 border-t border-line pt-4 text-xs text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{format(t.caveat, { h: qty(units, "hours", now.left) })}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

function Legend({ className, children }: { className: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={clsx("size-2.5 rounded-[2px]", className)} aria-hidden />
      {children}
    </span>
  );
}

/** What students like you went through after the choices on screen (descriptive, never a verdict). */
function buildEvidence(data: TwinTimeline, choices: Record<number, Choice>, hoursThisTerm: number, twin: T, t: T["machine"]) {
  const lines: string[] = [];
  const pair = (template: string, c: TwinComparison) => format(template, { a: chancePct(c.delayed_with, twin), b: chancePct(c.delayed_without, twin) });

  for (const course of data.registered) {
    const choice = choices[course.id];
    if (choice === "drop") {
      const s = course.stats;
      if (s?.delayed_if_dropped != null && s.delayed_if_kept != null) {
        lines.push(format(t.evDropCourse, { course: course.name, a: chancePct(s.delayed_if_dropped, twin), b: chancePct(s.delayed_if_kept, twin) }));
      } else if (data.evidence.drop) {
        lines.push(pair(t.evDrop, data.evidence.drop));
      }
    }
    if (choice === "fail" && course.stats) {
      lines.push(format(t.evFailCourse, { course: course.name, p: chancePct(1 - course.stats.pass_rate, twin) }));
    }
  }
  if (Object.values(choices).includes("fail") && data.evidence.fail) lines.push(pair(t.evFail, data.evidence.fail));
  // Dropping into a light term (below the minimum) is its own known risk.
  const dropped = Object.values(choices).includes("drop");
  if (dropped && hoursThisTerm < data.limits.min_hours && data.evidence.light) {
    lines.push(format(pair(t.evLight, data.evidence.light), { min: data.limits.min_hours }));
  }

  // Nothing chosen yet: invite a try rather than repeat the status card's cohort line.
  if (lines.length === 0) lines.push(t.tryIt);
  // Same sentence can come from two dropped courses with general numbers: show it once.
  return [...new Set(lines)];
}
