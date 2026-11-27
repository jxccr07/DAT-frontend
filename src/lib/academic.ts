import type { Grades } from "./types";

/** Grade scale used by the university (mirrors StudentController::gradeScale). */
export const GRADE_SCALE = [
  { letter: "A+", points: 4.0 },
  { letter: "A", points: 3.75 },
  { letter: "B+", points: 3.5 },
  { letter: "B", points: 3.0 },
  { letter: "C+", points: 2.5 },
  { letter: "C", points: 2.0 },
  { letter: "D+", points: 1.5 },
  { letter: "D", points: 1.0 },
  { letter: "F", points: 0 },
] as const;

export const MAX_GPA = 4;
export const AVG_HOURS_PER_SEMESTER = 15;

export const formatGpa = (value: number | null | undefined) => (value == null ? "—" : value.toFixed(2));

/** Totals needed to recompute a cumulative GPA (what-if simulator). */
export function gpaTotals(grades: Grades) {
  let qualityPoints = 0;
  let hours = 0;
  for (const term of grades.terms) {
    for (const course of term.courses) {
      qualityPoints += course.quality_points;
      hours += course.course?.hours ?? 0;
    }
  }
  return { qualityPoints, hours };
}

export function gpaTone(gpa: number | null | undefined) {
  if (gpa == null) return "neutral" as const;
  if (gpa >= 3.5) return "ok" as const;
  if (gpa >= 2.5) return "brand" as const;
  if (gpa >= 2) return "warn" as const;
  return "bad" as const;
}
