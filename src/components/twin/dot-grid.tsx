import clsx from "clsx";

/**
 * "Out of every 100": a 10×10 grid where each square is one student.
 * Filled squares = fell a semester or more behind. Easier to compare than two
 * close percentages, and shows that the rest did not.
 */
export function DotGrid({ share, label, accent }: { share: number; label: string; accent: boolean }) {
  const filled = Math.round(share * 100);
  return (
    <div role="img" aria-label={label} className="grid w-fit grid-cols-10 gap-[3px]">
      {Array.from({ length: 100 }, (_, i) => (
        <span
          key={i}
          className={clsx(
            "size-[7px] rounded-[1.5px] sm:size-2",
            i < filled ? (accent ? "bg-warn" : "bg-muted/70") : "bg-surface-2 ring-1 ring-line ring-inset",
          )}
        />
      ))}
    </div>
  );
}
