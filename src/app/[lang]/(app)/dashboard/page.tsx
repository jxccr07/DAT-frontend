import type { Metadata } from "next";
import { qty, type Units } from "@/i18n/plural";
import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, ArrowLeft, Mail, BookOpenCheck, CalendarDays, Info, Sprout, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { format, getDictionary, getLocale, type Dictionary, type Locale } from "@/i18n";
import { getGrades, getMe, getPlan, getRegistration, getSchedule, getTwin, getTwinTimeline, requireRole } from "@/lib/dal";
import { TwinStatusCard } from "@/components/twin/status-card";
import { TimeMachine } from "@/components/twin/time-machine";
import { AVG_HOURS_PER_SEMESTER, MAX_GPA, formatGpa, gpaTone } from "@/lib/academic";
import { EmptyState, PageSkeleton, ProgressRing, SectionTitle, StatStrip, toneBg, type Tone } from "@/components/ui/primitives";
import { FormAlert } from "@/components/ui/form-alert";
import type { Grades } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.dashboard };
}

export default async function DashboardPage({ searchParams }: PageProps<"/[lang]/dashboard">) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard locale={locale} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({
  locale,
  dict,
  searchParams,
}: {
  locale: Locale;
  dict: Dictionary;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("student");
  const [me, grades, plan, schedule, registration, twin, timeline, query] = await Promise.all([
    getMe(),
    getGrades(),
    getPlan(),
    getSchedule(),
    getRegistration(),
    getTwin().catch(() => ({ ready: false })),
    getTwinTimeline().catch(() => null),
    searchParams,
  ]);
  const t = dict.dashboard;

  const planHours = plan?.summary.plan_hours ?? 0;
  const passedHours = plan?.summary.passed_hours ?? grades.summary.passed_hours;
  const remaining = Math.max(0, planHours - passedHours);
  const percent = planHours ? Math.round((passedHours / planHours) * 100) : 0;
  const hasGrades = grades.terms.length > 0;

  const failedNotRetaken = plan?.semesters.flatMap((s) => s.courses).filter((c) => c.status === "failed").length ?? 0;
  // When the standing card is shown it already covers failed courses and a light load; don't repeat them.
  const insights = buildInsights(grades, twin.ready ? 0 : failedNotRetaken, twin.ready ? 0 : registration.registered_hours, registration.limits.min_hours, t, dict.common.units);

  const meta = [me.academic_plan?.major, me.study_year ? `${t.yearLabel} ${me.study_year}` : null, schedule.semester?.name].filter(Boolean);

  return (
    <div className="space-y-6">
      {query.welcome === "1" && <FormAlert tone="ok">{dict.auth.activated}</FormAlert>}

      {/* Greeting */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{t.welcome}</p>
          <h1 dir="auto" className="mt-0.5 text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            {me.full_name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {meta.map((item, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="size-1 rounded-full bg-line" aria-hidden />}
                {item}
              </span>
            ))}
          </p>
        </div>
        {/* The standing card has its own "go register" step; avoid two identical buttons. */}
        {!twin.ready && (
          <Link href={`/${locale}/registration`} className="btn-navy self-start sm:self-auto">
            {t.registerNow}
          </Link>
        )}
      </header>

      {me.unread_messages > 0 && (
        <Link
          href={`/${locale}/messages`}
          className="flex items-center gap-3 rounded-lg border border-brand/40 bg-brand-soft p-4 transition hover:border-brand"
        >
          <Mail className="size-5 shrink-0 text-brand" aria-hidden />
          <span className="flex-1 font-semibold">{dict.messages.newFromAdvisor}</span>
          <span className="text-sm font-medium text-brand">{dict.messages.open}</span>
        </Link>
      )}

      <TwinStatusCard status={twin} locale={locale} t={dict.twin} units={dict.common.units} />

      {/* Nothing to project once the plan is complete */}
      {timeline && timeline.remaining_hours > 0 && <TimeMachine data={timeline} t={dict.twin} units={dict.common.units} />}

      <StatStrip
        items={[
          {
            icon: Trophy,
            tone: gpaTone(grades.summary.cumulative_gpa),
            label: t.cumulativeGpa,
            value: formatGpa(grades.summary.cumulative_gpa),
            hint: `${t.outOf} ${MAX_GPA.toFixed(2)}`,
          },
          { icon: TrendingUp, tone: "info", label: t.semesterGpa, value: formatGpa(grades.summary.current_gpa) },
          { icon: BookOpenCheck, tone: "ok", label: t.passedHours, value: passedHours, hint: planHours ? `${t.outOf} ${planHours}` : undefined },
          {
            icon: CalendarDays,
            tone: "warn",
            label: t.currentCourses,
            value: schedule.summary.courses_count,
            hint: qty(dict.common.units, "hours", schedule.summary.total_hours),
          },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Plan progress */}
        <section className="card">
          <SectionTitle>{t.planProgress}</SectionTitle>
          <div className="flex items-center gap-5 p-5">
            <ProgressRing percent={percent} size={112} label={t.planProgress}>
              <p className="text-2xl font-bold">{percent}%</p>
            </ProgressRing>
            <div className="space-y-2 text-sm">
              {remaining === 0 && planHours > 0 ? (
                <p className="font-semibold text-ok">{t.graduated}</p>
              ) : (
                <>
                  <p>
                    <span className="text-xl font-bold">{remaining}</span> <span className="text-muted">{t.remainingHours}</span>
                  </p>
                  <p className="text-muted">
                    {t.estimatedGraduation} <span className="font-semibold text-fg">{Math.ceil(remaining / AVG_HOURS_PER_SEMESTER)}</span>{" "}
                    {t.semesters}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* GPA by term, or a welcome for students with no grades yet */}
        <section className="card lg:col-span-2">
          <SectionTitle>{t.gpaTrend}</SectionTitle>
          {hasGrades ? (
            <GpaTrend grades={grades} />
          ) : (
            <EmptyState icon={Sprout} title={t.newStudentTitle} body={t.newStudentBody} />
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <SectionTitle
            action={
              <Link href={`/${locale}/schedule`} className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                {t.viewSchedule}
                <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
              </Link>
            }
          >
            {t.thisSemester}
          </SectionTitle>
          {registration.registered.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={t.noCurrent}
              action={
                <Link href={`/${locale}/registration`} className="btn-navy">
                  {t.registerNow}
                </Link>
              }
            />
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {registration.registered.map((course) => (
                  <tr key={course.id}>
                    <td className="w-24 py-3 ps-4 font-mono text-xs text-muted sm:ps-5" dir="ltr" style={{ textAlign: "start" }}>
                      {course.code}
                    </td>
                    <td dir="auto" className="py-3 font-medium">
                      {course.name}
                    </td>
                    <td className="py-3 pe-4 text-end whitespace-nowrap text-muted sm:pe-5">
                      {qty(dict.common.units, "hours", course.hours)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card lg:col-span-2">
          <SectionTitle>{t.insights}</SectionTitle>
          <ul className="divide-y divide-line">
            {insights.map((insight) => (
              <li key={insight.text} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                <span className={`mt-1 h-4 w-1 shrink-0 rounded-full ${toneBg[insight.tone]}`} aria-hidden />
                <insight.icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                <p className="text-sm leading-relaxed">
                  {insight.text}
                  {insight.href && (
                    <>
                      {" "}
                      <Link href={`/${locale}/${insight.href}`} className="font-medium text-brand hover:underline">
                        {insight.cta}
                      </Link>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function buildInsights(grades: Grades, failedNotRetaken: number, registeredHours: number, minHours: number, t: Dictionary["dashboard"], units: Units) {
  const list: { text: string; tone: Tone; icon: typeof Info; href?: string; cta?: string }[] = [];
  const gpas = grades.terms.map((term) => term.semester_gpa).filter((g): g is number => g != null);

  if (failedNotRetaken > 0) list.push({ text: format(t.insight.retake, { n: failedNotRetaken }), tone: "bad", icon: AlertTriangle });

  if (registeredHours > 0 && registeredHours < minHours)
    list.push({ text: format(t.insight.lowLoad, { h: qty(units, "hours", registeredHours), min: qty(units, "hours", minHours) }), tone: "warn", icon: AlertTriangle });

  if (gpas.length >= 2) {
    const delta = gpas[gpas.length - 1] - gpas[gpas.length - 2];
    if (delta >= 0.05) list.push({ text: format(t.insight.gpaUp, { d: delta.toFixed(2) }), tone: "ok", icon: TrendingUp });
    if (delta <= -0.05)
      list.push({ text: format(t.insight.gpaDown, { d: Math.abs(delta).toFixed(2) }), tone: "warn", icon: TrendingDown, href: "grades", cta: t.openSimulator });
  }

  if ((grades.summary.cumulative_gpa ?? 0) >= 3.5) list.push({ text: t.insight.honors, tone: "ok", icon: Trophy });

  if (list.length === 0) list.push({ text: t.insight.onTrack, tone: "neutral", icon: Info });
  return list;
}

/** Term GPA as a simple ruled bar chart on the 0–4 scale. */
function GpaTrend({ grades }: { grades: Grades }) {
  const terms = grades.terms.filter((term) => term.semester_gpa != null);
  return (
    <div className="p-5">
      <div className="relative flex h-44 items-end gap-3 border-b border-line ps-7 sm:gap-6" role="list">
        {/* reference lines with their values (the y-axis) */}
        {[1, 2, 3, 4].map((v) => (
          <span key={v} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${(v / MAX_GPA) * 100}%` }} aria-hidden>
            <span className="absolute -top-2 start-0 bg-surface pe-1 text-[10px] leading-none text-muted">{v.toFixed(1)}</span>
          </span>
        ))}
        {terms.map((term, i) => {
          const gpa = term.semester_gpa ?? 0;
          return (
            <div key={term.semester?.id ?? i} role="listitem" aria-label={`${term.semester?.name}: ${gpa.toFixed(2)}`} className="relative flex h-full flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-xs font-semibold">{gpa.toFixed(2)}</span>
              <div className={`w-full max-w-11 rounded-t-sm ${i === terms.length - 1 ? "bg-brand" : "bg-brand/30"}`} style={{ height: `${Math.max(3, (gpa / MAX_GPA) * 100)}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-3 ps-7 sm:gap-6" aria-hidden>
        {terms.map((term, i) => (
          <span key={term.semester?.id ?? i} className="flex-1 truncate text-center text-[11px] text-muted" title={term.semester?.name}>
            <bdi>
              {term.semester?.academic_year} · {term.semester?.semester === "first" ? 1 : term.semester?.semester === "second" ? 2 : "S"}
            </bdi>
          </span>
        ))}
      </div>
    </div>
  );
}
