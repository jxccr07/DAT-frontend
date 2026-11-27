import { format, type Dictionary } from "@/i18n/types";
import type { TwinDecision } from "@/lib/types";

type T = Dictionary["twin"];

export const pct = (value: number) => `${Math.round(value * 100)}%`;

/** "9–15%": a 95% interval, rounded to whole points. */
export function rangePct(range: [number, number]) {
  const [lo, hi] = range.map((v) => v * 100);
  // A very large sample can round to "3–3%": show one decimal so the range stays visible.
  const digits = Math.round(lo) === Math.round(hi) ? 1 : 0;
  return `${lo.toFixed(digits)}–${hi.toFixed(digits)}%`;
}

export const count = (value: number, locale: string) => value.toLocaleString(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US");

/** "2.0 – 2.5" or "no GPA yet". */
export function bandLabel(range: [number, number] | null, t: T) {
  return range ? `${range[0].toFixed(1)} – ${range[1].toFixed(1)}` : t.newBand;
}

/** One-line description of the cohort a student is compared with. */
export function cohortLine(cohort: TwinDecision["cohort"], t: T) {
  return format(t.priceIntro, {
    term: cohort.term_no,
    range: bandLabel(cohort.gpa_range, t),
    lane: t.lanes[cohort.lane],
  });
}

/**
 * Probability of delay, never claiming certainty: "over 95%" / "under 5%" at the extremes.
 * (Pass rates and shares keep plain `pct`.)
 */
export function chancePct(value: number, t: Pick<T, "chanceOver" | "chanceUnder">) {
  if (value >= 0.955) return t.chanceOver;
  if (value <= 0.045) return t.chanceUnder;
  return pct(value);
}
