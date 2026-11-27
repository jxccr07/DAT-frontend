import type { Metadata } from "next";
import { qty } from "@/i18n/plural";
import { Suspense } from "react";
import { CheckCircle2, ChevronDown, FileQuestion } from "lucide-react";
import { getDictionary, getLocale, type Dictionary } from "@/i18n";
import { getPlan, requireRole } from "@/lib/dal";
import { Badge, EmptyState, PageHeader, PageSkeleton, ProgressBar, type Tone } from "@/components/ui/primitives";
import type { CourseStatus } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.plan };
}

export default async function PlanPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PlanView dict={dict} />
    </Suspense>
  );
}

const statusTone: Record<CourseStatus, Tone> = {
  passed: "ok",
  current_course: "info",
  failed: "bad",
  deleted_course: "neutral",
  not_studied: "neutral",
};

async function PlanView({ dict }: { dict: Dictionary }) {
  await requireRole("student");
  const plan = await getPlan();
  const t = dict.plan;

  if (!plan) {
    return (
      <>
        <PageHeader title={t.title} />
        <div className="card">
          <EmptyState icon={FileQuestion} title={dict.common.noData} />
        </div>
      </>
    );
  }

  const { summary } = plan;
  const percent = summary.plan_hours ? Math.round((summary.passed_hours / summary.plan_hours) * 100) : 0;
  // Open the first level that isn't finished.
  const firstOpen = plan.semesters.find((s) => !s.is_completed)?.number;

  return (
    <>
      <PageHeader title={t.title} subtitle={`${plan.plan.name} · ${plan.plan.college}`} />

      <section className="card mb-6 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{t.progress}</p>
            <p className="text-3xl font-bold">{percent}%</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge tone="ok">
              {summary.passed_hours} / {qty(dict.common.units, "hours", summary.plan_hours)}
            </Badge>
            <Badge tone="brand">
              {summary.passed_courses_count} / {summary.plan_courses_count} {t.courses}
            </Badge>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={summary.passed_hours} max={summary.plan_hours} tone="ok" label={t.progress} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
          {(Object.keys(t.status) as CourseStatus[]).map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <Badge tone={statusTone[key]}>{t.status[key]}</Badge>
            </span>
          ))}
        </div>
      </section>

      <div className="space-y-3">
        {plan.semesters.map((level) => {
          const passed = level.courses.filter((c) => c.is_passed).length;
          return (
            <details key={level.number} open={level.number === firstOpen} className="card group overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:px-5 [&::-webkit-details-marker]:hidden">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-md font-bold ${
                    level.is_completed ? "bg-ok-soft text-ok" : "bg-brand-soft text-brand"
                  }`}
                >
                  {level.is_completed ? <CheckCircle2 className="size-5" aria-hidden /> : level.number}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {dict.common.level} {level.number}
                  </p>
                  <p className="text-xs text-muted">
                    {passed}/{level.courses.length} · {qty(dict.common.units, "hours", level.hours)}
                  </p>
                </div>
                {level.is_completed && <Badge tone="ok">{t.levelDone}</Badge>}
                <ChevronDown className="size-5 text-muted transition group-open:rotate-180" aria-hidden />
              </summary>

              <div className="border-t border-line">
                {/* Table on wider screens, cards on phones */}
                <table className="hidden w-full text-sm sm:table">
                  <thead className="bg-surface-2 text-xs text-muted">
                    <tr>
                      <th scope="col" className="p-3 text-start font-medium">{t.code}</th>
                      <th scope="col" className="p-3 text-start font-medium">{t.name}</th>
                      <th scope="col" className="p-3 text-center font-medium">{t.hours}</th>
                      <th scope="col" className="p-3 text-end font-medium">{t.state}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {level.courses.map((course) => (
                      <tr key={course.id}>
                        <td className="p-3 font-mono text-xs" dir="ltr">{course.code}</td>
                        <td className="p-3">{course.name}</td>
                        <td className="p-3 text-center">{course.hours}</td>
                        <td className="p-3 text-end">
                          <Badge tone={statusTone[course.status]}>{t.status[course.status]}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ul className="divide-y divide-line sm:hidden">
                  {level.courses.map((course) => (
                    <li key={course.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p dir="auto" className="truncate text-sm font-medium">{course.name}</p>
                        <p className="text-xs text-muted">
                          <span dir="ltr">{course.code}</span> · {qty(dict.common.units, "hours", course.hours)}
                        </p>
                      </div>
                      <Badge tone={statusTone[course.status]}>{t.status[course.status]}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
