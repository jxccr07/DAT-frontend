import type { Metadata } from "next";
import { Suspense } from "react";
import { Database, Layers, TriangleAlert, Users } from "lucide-react";
import { format, getDictionary, getLocale, type Dictionary, type Locale } from "@/i18n";
import { getTwinMeta } from "@/lib/dal";
import { EmptyState, PageHeader, PageSkeleton, SectionTitle, StatStrip } from "@/components/ui/primitives";
import { count, pct } from "@/components/twin/twin-format";
import type { TwinMeta, TwinScores } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).twin.method.title };
}

export default async function TwinMethodPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return (
    <>
      <PageHeader title={dict.twin.method.title} subtitle={dict.twin.method.subtitle} />
      <Suspense fallback={<PageSkeleton />}>
        <Method locale={locale} dict={dict} />
      </Suspense>
    </>
  );
}

async function Method({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.twin.method;
  const meta = await getTwinMeta();
  if (!meta) return <EmptyState icon={Database} title={t.notReady} />;

  const bt = meta.backtest;
  // Only show an out-of-time column when the data allowed a fair one; otherwise say why not.
  const tm = bt.temporal && bt.temporal.available !== false && bt.temporal.students_scored > 0 ? bt.temporal : null;
  const temporalBlocked = bt.temporal?.available === false;
  const rows: { label: string; key: "auc" | "brier" | "accuracy" | "precision" | "recall"; asPct: boolean }[] = [
    { label: t.auc, key: "auc", asPct: false },
    { label: t.brier, key: "brier", asPct: false },
    { label: t.accuracy, key: "accuracy", asPct: true },
    { label: t.precision, key: "precision", asPct: true },
    { label: t.recall, key: "recall", asPct: true },
  ];
  // Random hold-out, out-of-time test (when the data allows it), then the naive baseline.
  const columns: { head: string; scores?: Partial<TwinScores> | null; lead: boolean }[] = [
    { head: t.ours, scores: bt, lead: true },
    ...(tm ? [{ head: t.temporal, scores: tm, lead: true }] : []),
    { head: t.baseline, scores: bt.baseline, lead: false },
  ];
  const show = (v: number | null | undefined, asPct: boolean) => (v == null ? "—" : asPct ? pct(v) : v.toFixed(2));
  const ci = (range: [number, number] | null | undefined) => (range ? `${range[0].toFixed(3)}–${range[1].toFixed(3)}` : null);
  const updated = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { dateStyle: "medium" }).format(
    new Date(meta.built_at),
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-3 rounded-md border border-warn/40 bg-warn-soft p-4 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
        <p>
          <b className="font-semibold text-warn">{t.syntheticTitle}: </b>
          {t.syntheticBody}
        </p>
      </div>

      <StatStrip
        items={[
          { label: t.studentsLabel, value: count(meta.students, locale), icon: Users },
          { label: t.recordsLabel, value: count(meta.records, locale), icon: Database },
          { label: t.snapshotsLabel, value: count(meta.snapshots, locale), icon: Layers, hint: `${t.updated}: ${updated}` },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <SectionTitle>{t.howTitle}</SectionTitle>
          <ol className="space-y-3 p-5">
            {t.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-[4px] bg-navy text-xs font-bold text-navy-fg">{i + 1}</span>
                <span className="pt-0.5">{format(step, { min: meta.light_load_below, gap: meta.delayed_gap_hours })}</span>
              </li>
            ))}
          </ol>
          <p className="border-t border-line px-5 py-3 text-xs text-muted">{format(t.minCohort, { n: meta.min_cohort })}</p>
        </section>

        <section className="card">
          <SectionTitle>{t.accuracyTitle}</SectionTitle>
          <div className="p-5">
            <p className="text-sm text-muted">{format(t.accuracyBody, { n: count(bt.students_scored, locale) })}</p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th scope="col" className="py-2 text-start font-medium" />
                  {columns.map((c) => (
                    <th key={c.head} scope="col" className={c.lead ? "py-2 ps-2 text-end font-semibold text-brand" : "py-2 ps-2 text-end font-medium"}>
                      {c.head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row" className="py-2.5 text-start font-normal">{r.label}</th>
                    {columns.map((c) => (
                      <td key={c.head} className={c.lead ? "py-2.5 ps-2 text-end text-base font-bold" : "py-2.5 ps-2 text-end text-muted"}>
                        {show(c.scores?.[r.key], r.asPct)}
                        {r.key === "auc" && ci(c.scores?.auc_ci) && (
                          <span className="block text-[11px] font-normal text-muted" dir="ltr">
                            {ci(c.scores?.auc_ci)}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {tm && (
              <p className="mt-3 text-xs text-muted">
                {format(t.temporalHint, { train: tm.train_up_to_semester, test: tm.test_semester, n: count(tm.students_scored, locale) })}
              </p>
            )}
            {temporalBlocked && <p className="mt-3 rounded-md bg-surface-2 p-3 text-xs text-muted">{t.temporalUnavailable}</p>}
            <p className="mt-1.5 text-xs text-muted">{t.baselineHint}</p>
            <p className="mt-1.5 text-xs text-muted">{t.ciHint}</p>
            <p className="mt-1.5 text-xs text-muted">
              <b className="font-medium text-fg">AUC:</b> {t.aucHint}
            </p>
          </div>
        </section>
      </div>

      <ImpactSection meta={meta} locale={locale} dict={dict} />

      <section className="card">
        <SectionTitle>{t.calibrationTitle}</SectionTitle>
        <div className="p-5">
          <p className="text-sm text-muted">{t.calibrationBody}</p>
          <ul className="mt-4 space-y-3">
            {bt.calibration.map((bin) => (
              <li key={bin.range[0]} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 text-xs">
                <span className="text-muted" dir="ltr">
                  {pct(bin.range[0])}–{pct(bin.range[1])}
                </span>
                <div className="space-y-1">
                  <Bar label={t.predicted} value={bin.predicted} className="bg-brand/40" />
                  <Bar label={t.actual} value={bin.actual} className="bg-navy dark:bg-brand" />
                  <p className="text-muted">{format(t.cases, { n: count(bin.n, locale) })}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card">
        <SectionTitle>{t.limitsTitle}</SectionTitle>
        <ul className="space-y-2 p-5">
          {t.limits.map((limit) => (
            <li key={limit} className="flex gap-2.5 text-sm">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-[2px] bg-warn" aria-hidden />
              {limit}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Bar({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-sm bg-surface-2" aria-hidden>
        <div className={`h-full rounded-sm ${className}`} style={{ width: `${Math.max(1, value * 100)}%` }} />
      </div>
      <span className="w-12 shrink-0 text-end font-medium" dir="ltr">
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  );
}

/** The system's own effect, measured from real use: how often seeing the price of a drop was followed by not dropping. */
function ImpactSection({ meta, locale, dict }: { meta: TwinMeta; locale: Locale; dict: Dictionary }) {
  const t = dict.twin.method;
  const impact = meta.impact;
  return (
    <section className="card">
      <SectionTitle>{t.impactTitle}</SectionTitle>
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted">{t.impactBody}</p>
        {!impact || impact.views === 0 ? (
          <p className="text-sm text-muted">{t.impactEmpty}</p>
        ) : (
          <>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-surface-2 p-3">
                <dt className="text-xs text-muted">{t.impactViews}</dt>
                <dd className="mt-1 text-2xl font-bold">{count(impact.views, locale)}</dd>
              </div>
              <div className="rounded-md bg-surface-2 p-3">
                <dt className="text-xs text-muted">{t.impactKept}</dt>
                <dd className="mt-1 text-2xl font-bold">
                  {count(impact.kept, locale)}
                  {impact.kept_rate != null && <span className="ms-2 text-base font-medium text-ok">{pct(impact.kept_rate)}</span>}
                </dd>
              </div>
              <div className="rounded-md bg-surface-2 p-3">
                <dt className="text-xs text-muted">{t.impactAlerts}</dt>
                <dd className="mt-1 text-2xl font-bold">{count(impact.alerts, locale)}</dd>
                <dd className="text-xs text-muted">{format(t.impactContacted, { c: count(impact.alerts_contacted, locale) })}</dd>
              </div>
            </dl>
            {(["large", "medium", "small"] as const).map((level) => {
              const row = impact.by_impact[level];
              return row ? (
                <p key={level} className="text-xs text-muted">
                  {format(t.impactByLevel, { level: dict.twin.impact[level], k: count(row.kept, locale), v: count(row.views, locale) })}
                </p>
              ) : null;
            })}
          </>
        )}
        <p className="border-t border-line pt-3 text-xs text-muted">{t.impactNote}</p>
      </div>
    </section>
  );
}
