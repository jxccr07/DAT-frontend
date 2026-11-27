"use client";

import { useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { FlaskConical, Inbox, Loader2, Lock, Minus, Plus, RotateCcw, Search, Star, TriangleAlert, Unlock, Users } from "lucide-react";
import clsx from "clsx";
import { decisionPreviewAction, dropCourseAction, registerCourseAction } from "@/lib/actions";
import { format, type Dictionary, type Locale } from "@/i18n/types";
import { qty, type Units } from "@/i18n/plural";
import { Ltr, richFormat } from "@/components/rich-format";
import { useToast } from "@/components/ui/toast";
import { Badge, EmptyState, ProgressBar, SectionTitle, Skeleton } from "@/components/ui/primitives";
import type { RegisteredCourse, Registration, RegistrationCourse, TwinCourse, TwinCourseRef, TwinDecision } from "@/lib/types";
import { DecisionCost } from "@/components/twin/decision-cost";
import { pct } from "@/components/twin/twin-format";

type Props = {
  locale: Locale;
  overview: Registration;
  dict: Pick<Dictionary, "registration" | "errors" | "common" | "twin">;
  lightDecision: TwinDecision | null;
};

type Preview = { status: "loading" } | { status: "ready"; data: TwinDecision | null } | { status: "error" };

type Filter = "all" | "recommended" | "retake";
type Optimistic = { type: "add"; course: RegistrationCourse } | { type: "drop"; id: number };

export function RegistrationBoard({ locale, overview, dict, lightDecision }: Props) {
  const t = dict.registration;
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<RegisteredCourse | null>(null);
  const [preview, setPreview] = useState<Preview>({ status: "loading" });
  // Opt-in: the advisor is told about this drop only if the student ticks the box.
  const [notifyAdvisor, setNotifyAdvisor] = useState(false);
  const tw = dict.twin;
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Optimistic UI: the list updates instantly, then the server refresh confirms (or rolls back).
  const [registered, applyOptimistic] = useOptimistic(overview.registered, (list, action: Optimistic) =>
    action.type === "add"
      ? [...list, { record_id: -action.course.id, ...action.course }]
      : list.filter((course) => course.id !== action.id),
  );

  const registeredIds = new Set(registered.map((c) => c.id));
  const usedHours = registered.reduce((sum, c) => sum + c.hours, 0);
  const { max_hours: maxHours, min_hours: minHours } = overview.limits;
  const canEdit = overview.window_open && overview.semester !== null;

  const errorText = (code: string) => (dict.errors as Record<string, string>)[code] ?? dict.errors.unknown;

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return overview.available.filter(
      (course) =>
        !registeredIds.has(course.id) &&
        (filter === "all" || (filter === "recommended" ? course.is_recommended : course.is_retake)) &&
        (!q || course.code.toLowerCase().includes(q) || course.name.toLowerCase().includes(q)),
    );
    // registeredIds is derived from `registered`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview.available, registered, query, filter]);

  const add = (course: RegistrationCourse) => {
    setBusyId(course.id);
    startTransition(async () => {
      applyOptimistic({ type: "add", course });
      const result = await registerCourseAction(course.id, locale);
      setBusyId(null);
      if (result.ok) toast("success", format(t.added, { course: course.name }));
      else toast("error", errorText(result.code));
    });
  };

  // Before confirming a drop, show what happened to similar students who made the same choice.
  const askDrop = (course: RegisteredCourse) => {
    setConfirming(course);
    setNotifyAdvisor(false);
    setPreview({ status: "loading" });
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
    void decisionPreviewAction("drop", course.id, locale).then((result) =>
      setPreview(result.ok ? { status: "ready", data: result.data ?? null } : { status: "error" }),
    );
  };

  const dropInstead = (ref: TwinCourseRef) => {
    const course = registered.find((c) => c.id === ref.id);
    if (course) askDrop(course);
  };

  const addInstead = (ref: TwinCourseRef) => {
    const course = overview.available.find((c) => c.id === ref.id);
    dialogRef.current?.close();
    if (course) add(course);
  };

  const confirmDrop = () => {
    const course = confirming;
    dialogRef.current?.close();
    if (!course) return;
    setBusyId(course.id);
    startTransition(async () => {
      applyOptimistic({ type: "drop", id: course.id });
      const result = await dropCourseAction(course.id, locale, notifyAdvisor);
      setBusyId(null);
      if (result.ok) toast("success", format(t.dropped, { course: course.name }));
      else toast("error", errorText(result.code));
    });
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t.filterAll },
    { key: "recommended", label: t.filterRecommended },
    { key: "retake", label: t.filterRetake },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Summary + registered */}
      <div className="space-y-6 lg:col-span-2">
        <section className="card space-y-4 p-5" aria-live="polite">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted">{overview.semester?.name}</p>
            <Badge tone={canEdit ? "ok" : "bad"}>
              {canEdit ? <Unlock className="size-3" aria-hidden /> : <Lock className="size-3" aria-hidden />}
              {canEdit ? t.windowOpen : t.windowClosed}
            </Badge>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted">{t.hoursUsed}</p>
              <p className="text-3xl font-bold">
                {usedHours}
                <span className="text-base font-medium text-muted"> / {maxHours}</span>
              </p>
            </div>
            <p className="text-xs text-muted">
              {t.min} {minHours} · {t.max} {maxHours}
            </p>
          </div>
          <ProgressBar
            value={usedHours}
            max={maxHours}
            tone={usedHours > maxHours ? "bad" : usedHours < minHours ? "warn" : "ok"}
            label={t.hoursUsed}
          />
          {usedHours < minHours && <p className="text-xs text-warn">{format(t.belowMin, { h: qty(dict.common.units, "hours", minHours - usedHours) })}</p>}
          {usedHours < minHours && lightDecision?.comparison && (
            <div className="rounded-md border border-warn/30 bg-warn-soft p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-warn">
                <TriangleAlert className="size-4 shrink-0" aria-hidden />
                {tw.lightTitle}
              </p>
              <p className="mt-1 text-fg/80">
                {format(tw.lightBody, {
                  min: qty(dict.common.units, "hours", minHours),
                  a: qty(dict.common.units, "hours", lightDecision.comparison.gap_with),
                  b: qty(dict.common.units, "hours", lightDecision.comparison.gap_without),
                })}
              </p>
            </div>
          )}
        </section>

        <section className="card">
          <SectionTitle action={<Badge tone="brand">{registered.length}</Badge>}>{t.registered}</SectionTitle>
          {registered.length === 0 ? (
            <EmptyState icon={Inbox} title={t.noneRegistered} />
          ) : (
            <ul className="divide-y divide-line">
              {registered.map((course) => (
                <li key={course.id} className={clsx("flex items-center gap-3 px-4 py-3 sm:px-5", course.record_id < 0 && "opacity-60")}>
                  <div className="min-w-0 flex-1">
                    <p dir="auto" className="truncate font-medium">{course.name}</p>
                    <p className="text-xs text-muted">
                      <span dir="ltr">{course.code}</span> · {qty(dict.common.units, "hours", course.hours)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost h-9 px-3 text-bad hover:bg-bad-soft"
                    onClick={() => askDrop(course)}
                    disabled={!canEdit || busyId !== null}
                    aria-label={`${t.drop} ${course.name}`}
                  >
                    {busyId === course.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Minus className="size-4" aria-hidden />}
                    <span>{busyId === course.id ? t.dropping : t.drop}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Available */}
      <section className="card lg:col-span-3">
        <SectionTitle action={<Badge>{available.length}</Badge>}>{t.available}</SectionTitle>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:px-5">
          <label className="relative flex-1">
            <span className="sr-only">{t.search}</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              className="input h-10 ps-9"
            />
          </label>
          <div role="radiogroup" aria-label={t.available} className="flex gap-1 rounded-md bg-surface-2 p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={clsx(
                  "min-h-10 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition sm:min-h-0",
                  filter === f.key ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {available.length === 0 ? (
          <EmptyState icon={Search} title={t.noneAvailable} />
        ) : (
          <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:px-5">
            {available.map((course) => {
              const exceeds = usedHours + course.hours > maxHours;
              return (
                <li key={course.id} className="flex flex-col gap-3 rounded-md border border-line p-3.5 transition hover:border-brand/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{course.name}</p>
                      <p className="mt-0.5 text-xs text-muted" dir="ltr">
                        {course.code}
                      </p>
                    </div>
                    <Badge>
                      {course.hours} {dict.common.hoursShort}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>
                      {dict.common.level} {course.level}
                    </Badge>
                    {course.is_recommended && (
                      <Badge tone="ok">
                        <Star className="size-3" aria-hidden />
                        {t.recommended}
                      </Badge>
                    )}
                    {course.is_retake && (
                      <Badge tone="bad">
                        <RotateCcw className="size-3" aria-hidden />
                        {t.retake}
                      </Badge>
                    )}
                    {course.has_lab && (
                      <Badge tone="warn">
                        <FlaskConical className="size-3" aria-hidden />
                        {t.hasLab}
                      </Badge>
                    )}
                  </div>
                  {course.twin && <TwinLine twin={course.twin} t={tw} units={dict.common.units} />}
                  <button
                    type="button"
                    className={clsx("mt-auto h-11 sm:h-9", exceeds ? "btn-outline" : "btn-primary")}
                    onClick={() => add(course)}
                    disabled={!canEdit || exceeds || busyId !== null}
                    aria-label={`${t.add} ${course.name}`}
                  >
                    {busyId === course.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                    {busyId === course.id ? t.adding : exceeds ? t.wouldExceed : t.add}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Drop confirmation with the price of the decision (native <dialog>: focus trap + Esc) */}
      <dialog
        ref={dialogRef}
        aria-labelledby="drop-title"
        onClose={() => setConfirming(null)}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100%-2rem))] overflow-y-auto rounded-lg border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-navy/60"
      >
        <div className="p-5 sm:p-6">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-brand uppercase">
            <span className="marker" aria-hidden />
            {tw.priceTitle}
          </p>
          <h2 id="drop-title" className="mt-2 text-lg font-semibold">
            {t.dropConfirmTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">{format(t.dropConfirmBody, { course: confirming?.name ?? "" })}</p>

          <div className="mt-5" aria-live="polite">
            {preview.status === "loading" && (
              <div className="space-y-3" aria-label={tw.loading}>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}
            {preview.status === "error" && <p className="text-sm text-muted">{tw.noData}</p>}
            {preview.status === "ready" &&
              (preview.data ? (
                <DecisionCost
                  decision={preview.data}
                  locale={locale}
                  t={tw}
                  onDropInstead={dropInstead}
                  onAdd={addInstead}
                  notifyAdvisor={notifyAdvisor}
                  onNotifyAdvisorChange={setNotifyAdvisor}
                  disabled={busyId !== null}
                  units={dict.common.units}
                />
              ) : (
                <p className="text-sm text-muted">{tw.noData}</p>
              ))}
          </div>
        </div>

        {/* Always in view, however long the evidence above: the decision never needs a scroll to reach */}
        <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-line bg-surface px-5 py-3 sm:flex sm:justify-end sm:px-6">
          {/* Keeping the course is the default: Enter never drops by accident */}
          <button type="button" className="btn-ghost h-11 text-bad hover:bg-bad-soft sm:h-10" onClick={confirmDrop}>
            {tw.dropAnyway}
          </button>
          <button type="button" className="btn-navy order-first h-11 sm:order-last sm:h-10" onClick={() => dialogRef.current?.close()} autoFocus>
            {tw.keepCourse}
          </button>
        </div>
      </dialog>
    </div>
  );
}

/** "Students like you: 85% pass · mostly B" under a course card, with where the number comes from. */
function TwinLine({ twin, t, units }: { twin: TwinCourse; t: Dictionary["twin"]; units: Units }) {
  const all = twin.band === "all";
  const hint = `${format(t.courseHint, { n: qty(units, "students", twin.n_taken) })}${all ? ` · ${t.allStudentsHint}` : ""}`;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t border-line pt-2.5 text-xs text-muted" title={hint}>
      <Users className="size-3.5 shrink-0 text-brand" aria-hidden />
      <span className="font-medium text-fg">{all ? t.allStudents : t.likeYou}:</span>
      <span>{format(t.passRate, { p: pct(twin.pass_rate) })}</span>
      {twin.typical_letter && (
        <>
          <span aria-hidden>·</span>
          <span>{richFormat(t.typical, { letter: <Ltr>{twin.typical_letter}</Ltr> })}</span>
        </>
      )}
      <span className="sr-only">{hint}</span>
    </p>
  );
}
