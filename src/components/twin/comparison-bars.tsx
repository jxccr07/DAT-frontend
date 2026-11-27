import clsx from "clsx";
import { format, type Dictionary } from "@/i18n/types";
import { qty, type Units } from "@/i18n/plural";
import type { TwinComparison } from "@/lib/types";
import { chancePct } from "./twin-format";

type Props = {
  comparison: TwinComparison;
  decision: "drop" | "light" | "fail";
  units: Units;
  t: Dictionary["twin"];
};

/**
 * Two rows, same scale: where similar students ended up two terms later with
 * and without the decision. The bar is "hours behind plan"; the label adds the
 * share who fell a full semester behind.
 */
export function ComparisonBars({ comparison: c, decision, units, t }: Props) {
  const max = Math.max(c.gap_with, c.gap_without, 1);
  const rows = [
    { label: t.actionWith[decision], n: c.n_with, gap: c.gap_with, delayed: c.delayed_with, accent: true },
    { label: t.actionWithout[decision], n: c.n_without, gap: c.gap_without, delayed: c.delayed_without, accent: false },
  ];

  return (
    <dl className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-semibold text-fg">{row.label}</span>
            <span className="text-muted">{qty(units, "students", row.n)}</span>
          </dt>
          <dd className="mt-1.5">
            <div className="h-2.5 overflow-hidden rounded-sm bg-surface-2" aria-hidden>
              <div
                className={clsx("h-full rounded-sm", row.accent ? "bg-warn" : "bg-muted/50")}
                style={{ width: `${Math.max(4, (row.gap / max) * 100)}%` }}
              />
            </div>
            <p className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-muted">
              <span className={clsx(row.accent && "font-medium text-fg")}>{format(t.behindAvg, { h: qty(units, "hours", row.gap) })}</span>
              <span>{format(t.delayedShare, { p: chancePct(row.delayed, t) })}</span>
            </p>
          </dd>
        </div>
      ))}
    </dl>
  );
}
