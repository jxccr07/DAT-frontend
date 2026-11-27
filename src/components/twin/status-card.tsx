import Link from "next/link";
import { ArrowLeft, CircleCheck, CircleAlert, Info, Sprout } from "lucide-react";
import clsx from "clsx";
import { format, type Dictionary, type Locale } from "@/i18n/types";
import { qty, type Units } from "@/i18n/plural";
import type { TwinReason, TwinStatus } from "@/lib/types";
import { ProgressBar } from "@/components/ui/primitives";
import { chancePct, pct } from "./twin-format";

type Standing = Dictionary["advisor"]["standing"];
type Props = {
  status: TwinStatus;
  locale: Locale;
  t: Dictionary["twin"];
  units: Units;
  /** When an advisor views a student: third-person wording and no "go register" button. */
  standing?: Standing;
};

/** "Where you stand": distance from plan, projected terms, how similar students fared, why, and one next step. */
export function TwinStatusCard({ status, locale, t: twin, units, standing }: Props) {
  const t = { ...twin, ...standing };
  const forAdvisor = standing !== undefined;
  const p = status.profile;
  if (!status.ready || !p) return null;

  const onTrack = p.lane === "on";
  const delayed = status.cohort?.delayed ?? null;
  const tone = onTrack ? "ok" : delayed != null && delayed >= 0.5 ? "bad" : "warn";
  const projection = status.projection;
  const reasons = status.reasons ?? [];

  return (
    <section className="card overflow-hidden" aria-labelledby="twin-status">
      <div className="grid gap-0 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4 p-5 sm:p-6">
          <p id="twin-status" className="flex items-center gap-2 text-xs font-semibold tracking-wide text-brand uppercase">
            <span className="marker" aria-hidden />
            {t.statusTitle}
          </p>

          <div className="flex items-start gap-3">
            {onTrack ? (
              <CircleCheck className="mt-0.5 size-6 shrink-0 text-ok" aria-hidden />
            ) : (
              <CircleAlert className={clsx("mt-0.5 size-6 shrink-0", tone === "bad" ? "text-bad" : "text-warn")} aria-hidden />
            )}
            <div>
              <h2 className="text-xl font-bold">{onTrack ? t.onTrack : format(t.behindBy, { h: qty(units, "hours", p.gap_hours) })}</h2>
              {projection && (
                <p className="mt-1 text-sm text-muted">
                  {projection.delay_terms > 0
                    ? format(t.projection, {
                        load: qty(units, "hours", projection.assumed_load),
                        n: qty(units, "terms", projection.terms_needed),
                        p: qty(units, "terms", projection.plan_terms_left),
                      })
                    : format(t.projectionOnTime, { load: qty(units, "hours", projection.assumed_load) })}
                </p>
              )}
            </div>
          </div>

          <div>
            <ProgressBar value={p.passed_hours} max={Math.max(p.plan_hours, 1)} tone="brand" label={t.statusTitle} />
            <p className="mt-1.5 text-xs text-muted">{format(t.passedOf, { a: qty(units, "hours", p.passed_hours), b: qty(units, "hours", p.plan_hours) })}</p>
          </div>

          {status.cohort && (
            <p className="rounded-md bg-surface-2 p-3 text-sm">
              {format(t.outlook, { n: qty(units, "students", status.cohort.n), p: chancePct(status.cohort.delayed, twin) })}
            </p>
          )}

          {/* A hard number comes with what actually worked for students in the same position. */}
          {!onTrack && status.cohort && status.cohort.what_worked.length > 0 && (
            <div className="rounded-md border border-ok/30 bg-ok-soft p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-ok">
                <Sprout className="size-4 shrink-0" aria-hidden />
                {twin.whatWorkedTitle}
              </p>
              <p className="mt-1 text-xs text-fg/75">
                {format(twin.whatWorkedIntro, { n: qty(units, "students", status.cohort.what_worked[0].n_on_time) })}
              </p>
              <ul className="mt-1.5 space-y-1 text-fg/85">
                {status.cohort.what_worked.map((w) => (
                  <li key={w.code} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-[2px] bg-ok" aria-hidden />
                    {format(twin.worked[w.code], { a: pct(w.on_time), b: pct(w.delayed) })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4 border-t border-line bg-surface-2/50 p-5 sm:p-6 lg:border-s lg:border-t-0">
          {reasons.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">{t.reasonsTitle}</h3>
              <ul className="mt-2 space-y-1.5">
                {reasons.map((reason) => (
                  <li key={reason.code} className="flex gap-2 text-sm text-fg/85">
                    <span className="mt-2 size-1.5 shrink-0 rounded-[2px] bg-bad" aria-hidden />
                    {reasonText(reason, t, units)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status.action && (
            <div>
              <h3 className="text-sm font-semibold">{t.nextStep}</h3>
              <p className="mt-1 text-sm text-fg/85">{t.action[status.action]}</p>
              {!forAdvisor && status.action !== "keep_going" && (
                <Link href={`/${locale}/registration`} className="btn-navy mt-3 h-9 px-4 text-sm">
                  {t.goRegister}
                  <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
                </Link>
              )}
            </div>
          )}

          <Link href={`/${locale}/twin`} className="flex items-center gap-1.5 text-xs font-medium text-brand underline-offset-2 hover:underline">
            <Info className="size-3.5" aria-hidden />
            {t.how}
          </Link>
        </div>
      </div>
    </section>
  );
}

function reasonText(reason: TwinReason, t: Pick<Dictionary["twin"], "reason">, units: Units) {
  switch (reason.code) {
    case "behind_plan":
      return format(t.reason.behind_plan, { hours: qty(units, "hours", reason.hours) });
    case "failed_pending":
      return format(t.reason.failed_pending, { count: reason.count });
    case "light_load":
      return format(t.reason.light_load, { hours: qty(units, "hours", reason.hours), min: qty(units, "hours", reason.min) });
    case "low_gpa":
      return format(t.reason.low_gpa, { gpa: reason.gpa.toFixed(2) });
  }
}
