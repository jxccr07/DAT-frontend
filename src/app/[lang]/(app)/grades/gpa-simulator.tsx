"use client";

import { useState } from "react";
import { qty } from "@/i18n/plural";
import { Ltr } from "@/components/rich-format";
import { Calculator, TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { GRADE_SCALE, formatGpa } from "@/lib/academic";
import { format, type Dictionary } from "@/i18n/types";
import type { TwinComparison } from "@/lib/types";

type Course = { id: number; name: string; code: string; hours: number };

type Props = {
  totals: { qualityPoints: number; hours: number };
  currentGpa: number | null;
  courses: Course[];
  dict: Pick<Dictionary, "grades" | "common" | "twin">;
  failImpact: TwinComparison | null;
};

/** "What if" GPA: pick an expected grade per current course, see the new cumulative GPA. */
export function GpaSimulator({ totals, currentGpa, courses, dict, failImpact }: Props) {
  const t = dict.grades;
  const [picks, setPicks] = useState<Record<number, string>>(() =>
    Object.fromEntries(courses.map((c) => [c.id, "B"])),
  );

  const extra = courses.reduce(
    (acc, course) => {
      const points = GRADE_SCALE.find((g) => g.letter === picks[course.id])?.points ?? 0;
      return { qp: acc.qp + points * course.hours, hours: acc.hours + course.hours };
    },
    { qp: 0, hours: 0 },
  );

  const totalHours = totals.hours + extra.hours;
  const expected = totalHours > 0 ? (totals.qualityPoints + extra.qp) / totalHours : null;
  const delta = expected != null && currentGpa != null ? expected - currentGpa : null;
  const anyFail = courses.some((c) => picks[c.id] === "F");

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-md bg-brand-soft text-brand">
          <Calculator className="size-5" aria-hidden />
        </span>
        <h2 className="font-semibold">{t.simulator}</h2>
      </div>
      <p className="mt-2 text-sm text-muted">{t.simulatorBody}</p>
      <p className="mt-1.5 text-xs text-muted">
        {t.scale}:{" "}
        {GRADE_SCALE.map((g, i) => (
          <span key={g.letter}>
            {i > 0 && " · "}
            <Ltr>{`${g.letter} ${g.points}`}</Ltr>
          </span>
        ))}
      </p>

      {courses.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{t.noCurrent}</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {courses.map((course) => (
            <li key={course.id} className="flex items-center gap-3">
              <label htmlFor={`sim-${course.id}`} className="min-w-0 flex-1">
                <span dir="auto" className="block truncate text-sm">{course.name}</span>
                <span className="text-xs text-muted">
                  {qty(dict.common.units, "hours", course.hours)}
                </span>
              </label>
              <select
                id={`sim-${course.id}`}
                value={picks[course.id]}
                onChange={(e) => setPicks((p) => ({ ...p, [course.id]: e.target.value }))}
                className="input h-9 w-20 px-2 text-center"
                dir="ltr"
              >
                {GRADE_SCALE.map((g) => (
                  <option key={g.letter} value={g.letter}>
                    {g.letter}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2 rounded-md bg-surface-2 p-3 text-center" aria-live="polite">
        <div>
          <p className="text-xs text-muted">{t.current}</p>
          <p className="font-bold">{formatGpa(currentGpa)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{t.expectedGpa}</p>
          <p className="text-lg font-bold text-brand">{formatGpa(expected)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{t.change}</p>
          <p className={clsx("font-bold", delta != null && delta >= 0.05 && !anyFail && "text-ok", delta != null && (delta <= -0.05 || anyFail) && "text-bad")} dir="ltr">
            {delta == null ? "—" : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`}
          </p>
        </div>
      </div>

      {/* What-if beyond GPA: what failing did to similar students' progress */}
      {anyFail && failImpact && (
        <div className="mt-4 rounded-md border border-bad/30 bg-bad-soft p-3 text-sm" aria-live="polite">
          <p className="flex items-center gap-2 font-semibold text-bad">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            {dict.twin.failTitle}
          </p>
          <p className="mt-1 text-fg/80">
            {format(dict.twin.failBody, { a: qty(dict.common.units, "hours", failImpact.gap_with), b: qty(dict.common.units, "hours", failImpact.gap_without) })}
          </p>
        </div>
      )}
    </section>
  );
}
