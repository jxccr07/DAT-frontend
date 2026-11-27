import type { Metadata } from "next";
import { parseApiDate } from "@/lib/format";
import Link from "next/link";
import { Suspense } from "react";
import { BellRing, ChevronLeft, ChevronRight, MessageSquareText, Search, TrendingDown, TriangleAlert, Users } from "lucide-react";
import clsx from "clsx";
import { format, getDictionary, getLocale, type Dictionary, type Locale } from "@/i18n";
import { getAdvisorOverview, getAdvisorStudents, getBeforeDeadline, requireRole } from "@/lib/dal";
import { Badge, EmptyState, PageHeader, PageSkeleton, SectionTitle, StatStrip, type Tone } from "@/components/ui/primitives";
import { AlertList } from "@/components/advising/alert-list";
import { BeforeDeadline } from "@/components/advising/before-deadline";
import { count, pct } from "@/components/twin/twin-format";
import { qty, type Units } from "@/i18n/plural";
import type { AdvisorPriority, AdvisorStudentRow } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).advisor.title };
}

const FILTERS = ["all", "alerts", "risk", "behind"] as const;
type Filter = (typeof FILTERS)[number];

export default async function AdvisorPage({ searchParams }: PageProps<"/[lang]/advisor">) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Advisor locale={locale} dict={dict} searchParams={searchParams} />
    </Suspense>
  );
}

async function Advisor({
  locale,
  dict,
  searchParams,
}: {
  locale: Locale;
  dict: Dictionary;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("advisor");
  const query = await searchParams;
  const filter: Filter = FILTERS.includes(query.filter as Filter) ? (query.filter as Filter) : "all";
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const page = Math.max(1, Number(query.page) || 1);

  const [overview, students, deadline] = await Promise.all([getAdvisorOverview(), getAdvisorStudents(filter, q, page), getBeforeDeadline().catch(() => null)]);
  const t = dict.advisor;
  const href = (params: Partial<{ filter: Filter; q: string; page: number }>) => {
    const next = new URLSearchParams();
    const merged = { filter, q, page: 1, ...params };
    if (merged.filter !== "all") next.set("filter", merged.filter);
    if (merged.q) next.set("q", merged.q);
    if (merged.page > 1) next.set("page", String(merged.page));
    const s = next.toString();
    return `/${locale}/advisor${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.title}
        subtitle={
          <span>
            <span dir="auto" className="font-medium text-fg">{overview.advisor.full_name}</span>
            {overview.advisor.department && <> · {overview.advisor.department}</>}
            <span className="mt-1 block">{t.subtitle}</span>
          </span>
        }
      />

      <StatStrip
        items={[
          { label: t.students, value: count(overview.counts.students, locale), icon: Users },
          { label: t.unseenAlerts, value: overview.counts.unseen_alerts, icon: BellRing, tone: overview.counts.unseen_alerts ? "bad" : "brand" },
          { label: t.critical, value: overview.counts.critical, icon: TriangleAlert, tone: "bad", hint: t.criticalHint },
          { label: t.behind, value: overview.counts.behind, icon: TrendingDown, tone: "warn" },
        ]}
      />

      {overview.unread_replies.length > 0 && (
        <section className="card border-brand/40">
          <SectionTitle action={<Badge tone="brand">{overview.unread_replies.length}</Badge>}>{t.repliesTitle}</SectionTitle>
          <ul className="divide-y divide-line">
            {overview.unread_replies.map((r) => (
              <li key={r.id}>
                <Link href={`/${locale}/advisor/students/${r.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/50">
                  <MessageSquareText className="size-4 shrink-0 text-brand" aria-hidden />
                  <span dir="auto" className="flex-1 truncate font-medium">{r.full_name}</span>
                  <Badge tone="brand">{r.count}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The week in four numbers, before the work list */}
      <section className="card">
        <SectionTitle>{t.week.title}</SectionTitle>
        <dl className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:px-5">
          {(
            [
              ["alerts", overview.week.alerts],
              ["contacted", overview.week.contacted],
              ["views", overview.week.views],
              ["kept", overview.week.kept],
            ] as const
          ).map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs text-muted">{t.week[key]}</dt>
              <dd className="mt-0.5 text-xl font-bold">{count(value, locale)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {deadline && (
        <BeforeDeadline list={deadline} advisorName={overview.advisor.full_name} locale={locale} t={t} errors={dict.errors} units={dict.common.units} />
      )}

      <Priorities priorities={overview.priorities} locale={locale} t={t} units={dict.common.units} />

      {overview.impact.views + overview.impact.alerts > 0 && (
        <section className="card">
          <SectionTitle>{t.impactTitle}</SectionTitle>
          <dl className="grid gap-3 p-4 sm:grid-cols-3 sm:px-5">
            <div>
              <dt className="text-xs text-muted">{t.impactViews}</dt>
              <dd className="mt-0.5 text-lg font-bold">{count(overview.impact.views, locale)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t.impactKept}</dt>
              <dd className="mt-0.5 text-lg font-bold">
                {format(t.impactOf, { a: count(overview.impact.kept, locale), b: count(overview.impact.views, locale) })}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t.impactContacted}</dt>
              <dd className="mt-0.5 text-lg font-bold">
                {format(t.impactOf, { a: count(overview.impact.alerts_contacted, locale), b: count(overview.impact.alerts, locale) })}
              </dd>
            </div>
          </dl>
        </section>
      )}

      <section className="card">
        <SectionTitle action={overview.counts.unseen_alerts > 0 ? <Badge tone="bad">{overview.counts.unseen_alerts}</Badge> : undefined}>
          {t.alertsTitle}
        </SectionTitle>
        <AlertList alerts={overview.alerts} locale={locale} t={t} errors={dict.errors} units={dict.common.units} />
      </section>

      <section className="card">
        <SectionTitle action={<Badge>{count(students.meta.total, locale)}</Badge>}>{t.title}</SectionTitle>

        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:px-5">
          <form action={`/${locale}/advisor`} className="relative flex-1" role="search">
            {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
            <label htmlFor="advisor-q" className="sr-only">
              {t.search}
            </label>
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input id="advisor-q" type="search" name="q" defaultValue={q} placeholder={t.search} className="input h-10 ps-9" />
          </form>
          <nav aria-label={t.title} className="flex gap-1 overflow-x-auto rounded-md bg-surface-2 p-1">
            {FILTERS.map((f) => (
              <Link
                key={f}
                href={href({ filter: f })}
                aria-current={filter === f ? "page" : undefined}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition",
                  filter === f ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
                )}
              >
                {t.filters[f]}
              </Link>
            ))}
          </nav>
        </div>

        {students.data.length === 0 ? (
          <EmptyState icon={Users} title={t.empty} />
        ) : (
          <>
          {/* Phones: one card per student (no hidden horizontal scroll) */}
          <ul className="divide-y divide-line sm:hidden">
            {students.data.map((s) => (
              <StudentCard key={s.id} s={s} locale={locale} t={t} />
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2/60 text-xs text-muted">
                  <th scope="col" className="px-5 py-2.5 text-start font-medium">{t.colStudent}</th>
                  <th scope="col" className="px-3 py-2.5 text-start font-medium">{t.colRisk}</th>
                  <th scope="col" className="px-3 py-2.5 text-start font-medium">{t.colGap}</th>
                  <th scope="col" className="px-3 py-2.5 text-start font-medium">{t.colGpa}</th>
                  <th scope="col" className="px-3 py-2.5 text-start font-medium">{t.colTerm}</th>
                  <th scope="col" className="px-5 py-2.5 text-start font-medium">{t.colContact}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {students.data.map((s) => {
                  const { tone, level } = riskLevel(s.tier);
                  return (
                    <tr key={s.id} className="hover:bg-surface-2/50">
                      <td className="px-5 py-3">
                        <Link href={`/${locale}/advisor/students/${s.id}`} className="group flex items-center gap-2">
                          <span className="min-w-0">
                            <span dir="auto" className="block truncate font-medium group-hover:text-brand group-hover:underline">
                              {s.full_name}
                            </span>
                            <span className="text-xs text-muted" dir="ltr">
                              {s.student_id}
                            </span>
                          </span>
                          {s.unseen_alerts > 0 && (
                            <Badge tone="bad">
                              <BellRing className="size-3" aria-hidden />
                              {s.unseen_alerts}
                            </Badge>
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={tone}>
                          {t.riskLabel[level]}
                          {s.risk != null && <span className="opacity-75">· {riskText(s.risk, t)}</span>}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">{s.gap_hours == null ? "—" : format(t.hoursShort, { h: s.gap_hours })}</td>
                      <td className="px-3 py-3 font-medium">{s.gpa == null ? "—" : s.gpa.toFixed(2)}</td>
                      <td className="px-3 py-3 text-muted">{s.term_no == null ? "—" : format(t.termShort, { n: s.term_no })}</td>
                      <td className="px-5 py-3 text-xs text-muted">
                        {s.last_contact_at
                          ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { dateStyle: "medium" }).format(
                              parseApiDate(s.last_contact_at),
                            )
                          : t.never}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}

        {students.meta.last_page > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm">
            <span className="text-muted">{format(t.page, { a: students.meta.current_page, b: students.meta.last_page })}</span>
            <div className="flex gap-2">
              <PageLink href={href({ page: page - 1 })} disabled={page <= 1} label={t.prev} icon="prev" />
              <PageLink href={href({ page: page + 1 })} disabled={page >= students.meta.last_page} label={t.next} icon="next" />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function PageLink({ href, disabled, label, icon }: { href: string; disabled: boolean; label: string; icon: "prev" | "next" }) {
  const Icon = icon === "prev" ? ChevronLeft : ChevronRight;
  const content = (
    <>
      {icon === "prev" && <Icon className="size-4 rtl:rotate-180" aria-hidden />}
      {label}
      {icon === "next" && <Icon className="size-4 rtl:rotate-180" aria-hidden />}
    </>
  );
  return disabled ? (
    <span className="btn-outline h-11 sm:h-8 cursor-not-allowed px-3 text-xs opacity-50" aria-disabled>
      {content}
    </span>
  ) : (
    <Link href={href} className="btn-outline h-11 sm:h-8 px-3 text-xs">
      {content}
    </Link>
  );
}

/** Tier comes from the API: "critical" is relative (top 10% of this advisor's students), the rest from cohort risk. */
function riskLevel(tier: AdvisorStudentRow["tier"]): { tone: Tone; level: AdvisorStudentRow["tier"] } {
  const tones: Record<AdvisorStudentRow["tier"], Tone> = { critical: "bad", high: "warn", mid: "info", low: "ok", none: "neutral" };
  return { tone: tones[tier], level: tier };
}

/** Never claim certainty: anything from 95% up reads "over 95%". */
function riskText(risk: number, t: Dictionary["advisor"]) {
  return risk >= 0.95 ? t.riskOver : pct(risk);
}

/** "Who to see this week": five students and the reasons, instead of hundreds of high-risk rows. */
function Priorities({ priorities, locale, t, units }: { priorities: AdvisorPriority[]; locale: Locale; t: Dictionary["advisor"]; units: Units }) {
  return (
    <section className="card">
      <SectionTitle>{t.prioritiesTitle}</SectionTitle>
      <p className="px-5 pt-3 text-xs text-muted">{t.prioritiesBody}</p>
      {priorities.length === 0 ? (
        <p className="p-5 text-sm text-muted">{t.prioritiesEmpty}</p>
      ) : (
        <ol className="grid gap-3 p-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-5">
          {priorities.map((p, i) => (
            <li key={p.id}>
              <Link
                href={`/${locale}/advisor/students/${p.id}`}
                className="flex h-full flex-col gap-2 rounded-md border border-line p-3 transition hover:border-brand/50 hover:bg-surface-2/50"
              >
                <span className="flex items-center gap-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-[4px] bg-navy text-xs font-bold text-navy-fg dark:bg-brand dark:text-brand-fg">
                    {i + 1}
                  </span>
                  <span dir="auto" className="truncate text-sm font-semibold">{p.full_name}</span>
                </span>
                <ul className="space-y-1 text-xs text-muted">
                  {p.reasons.map((r) => (
                    <li key={r.code} className={clsx(r.code === "alert" && "font-medium text-bad")}>
                      {r.code === "reply" && <span className="font-medium text-brand">{t.priorityReason.reply}</span>}
                      {r.code === "alert" && t.priorityReason.alert}
                      {r.code === "below_min" && format(t.priorityReason.below_min, { hours: qty(units, "hours", r.hours), min: qty(units, "hours", r.min) })}
                      {r.code === "failed" && format(t.priorityReason.failed, { count: r.count })}
                      {r.code === "behind" && format(t.priorityReason.behind, { hours: qty(units, "hours", r.hours) })}
                    </li>
                  ))}
                </ul>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function StudentCard({ s, locale, t }: { s: AdvisorStudentRow; locale: Locale; t: Dictionary["advisor"] }) {
  const { tone, level } = riskLevel(s.tier);
  return (
    <li>
      <Link href={`/${locale}/advisor/students/${s.id}`} className="block space-y-2 px-4 py-3 hover:bg-surface-2/50">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span dir="auto" className="block truncate font-medium">{s.full_name}</span>
            <span className="text-xs text-muted" dir="ltr">{s.student_id}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {s.unseen_alerts > 0 && (
              <Badge tone="bad">
                <BellRing className="size-3" aria-hidden />
                {s.unseen_alerts}
              </Badge>
            )}
            <Badge tone={tone}>
              {t.riskLabel[level]}
              {s.risk != null && <span className="opacity-75">· {riskText(s.risk, t)}</span>}
            </Badge>
          </span>
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>{t.colGap}: <b className="font-medium text-fg">{s.gap_hours == null ? "—" : format(t.hoursShort, { h: s.gap_hours })}</b></span>
          <span>{t.colGpa}: <b className="font-medium text-fg">{s.gpa == null ? "—" : s.gpa.toFixed(2)}</b></span>
          <span>{t.colTerm}: <b className="font-medium text-fg">{s.term_no == null ? "—" : format(t.termShort, { n: s.term_no })}</b></span>
        </span>
      </Link>
    </li>
  );
}
