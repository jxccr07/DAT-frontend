import type { Metadata } from "next";
import { qty } from "@/i18n/plural";
import { Suspense } from "react";
import { BookOpenCheck, ClipboardX, Hash, Trophy } from "lucide-react";
import { getDictionary, getLocale, type Dictionary } from "@/i18n";
import { getGrades, getRegistration, getTwin, requireRole } from "@/lib/dal";
import { formatGpa, gpaTone, gpaTotals } from "@/lib/academic";
import { Badge, EmptyState, PageHeader, PageSkeleton, StatStrip } from "@/components/ui/primitives";
import { GpaSimulator } from "./gpa-simulator";
import { PrintButton } from "./print-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.grades };
}

export default async function GradesPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return (
    <>
      <PageHeader title={dict.grades.title} actions={<PrintButton label={dict.grades.print} />} />
      <Suspense fallback={<PageSkeleton />}>
        <GradesView dict={dict} />
      </Suspense>
    </>
  );
}

async function GradesView({ dict }: { dict: Dictionary }) {
  await requireRole("student");
  const [grades, registration, twin] = await Promise.all([getGrades(), getRegistration(), getTwin().catch(() => null)]);
  const t = dict.grades;
  const totals = gpaTotals(grades);
  const terms = [...grades.terms].reverse(); // newest first

  return (
    <div className="space-y-6">
      <StatStrip
        items={[
          {
            icon: Trophy,
            tone: gpaTone(grades.summary.cumulative_gpa),
            label: dict.dashboard.cumulativeGpa,
            value: formatGpa(grades.summary.cumulative_gpa),
          },
          { icon: BookOpenCheck, tone: "ok", label: dict.dashboard.passedHours, value: grades.summary.passed_hours },
          { icon: Hash, tone: "info", label: t.coursesCount, value: grades.summary.courses_count },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-4 xl:col-span-2">
          {terms.length === 0 && (
            <div className="card">
              <EmptyState icon={ClipboardX} title={t.empty} />
            </div>
          )}
          {terms.map((term, i) => (
            <section key={term.semester?.id ?? i} className="card overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
                <h2 className="flex items-center gap-2.5 font-semibold">
                  <span className="marker" aria-hidden />
                  {term.semester?.name}
                </h2>
                <div className="flex gap-2">
                  <Badge>
                    {qty(dict.common.units, "hours", term.hours)}
                  </Badge>
                  <Badge tone={gpaTone(term.semester_gpa)}>
                    {t.termGpa}: {formatGpa(term.semester_gpa)}
                  </Badge>
                </div>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full sm:min-w-[520px] text-sm">
                  <thead className="bg-surface-2 text-xs text-muted">
                    <tr>
                      <th scope="col" className="px-2 py-3 sm:p-3 text-start font-medium">{t.course}</th>
                      <th scope="col" className="px-2 py-3 sm:p-3 text-center font-medium">{t.hours}</th>
                      <th scope="col" className="px-2 py-3 sm:p-3 text-center font-medium">{t.grade}</th>
                      <th scope="col" className="px-2 py-3 sm:p-3 text-center font-medium">{t.letter}</th>
                      <th scope="col" className="px-2 py-3 sm:p-3 text-end font-medium">{t.points}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {term.courses.map((row) => (
                      <tr key={row.id}>
                        <td className="px-2 py-3 sm:p-3">
                          <p dir="auto" className="font-medium">{row.course?.name}</p>
                          <p className="text-xs text-muted" dir="ltr">
                            {row.course?.code}
                          </p>
                        </td>
                        <td className="px-2 py-3 sm:p-3 text-center">{row.course?.hours}</td>
                        <td className="px-2 py-3 sm:p-3 text-center">{row.grade.toFixed(0)}</td>
                        <td className="px-2 py-3 sm:p-3 text-center">
                          <Badge tone={row.status === "failed" ? "bad" : row.points >= 3.5 ? "ok" : "brand"}><bdi dir="ltr">{row.letter}</bdi></Badge>
                        </td>
                        <td className="px-2 py-3 sm:p-3 text-end font-mono">{row.points.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        <aside className="no-print xl:sticky xl:top-20 xl:self-start">
          <GpaSimulator
            totals={totals}
            currentGpa={grades.summary.cumulative_gpa}
            courses={registration.registered.map((c) => ({ id: c.id, name: c.name, code: c.code, hours: c.hours }))}
            dict={{ grades: t, common: dict.common, twin: dict.twin }}
            failImpact={twin?.fail_impact ?? null}
          />
        </aside>
      </div>
    </div>
  );
}
