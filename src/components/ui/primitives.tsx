import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type Tone = "brand" | "ok" | "warn" | "bad" | "info" | "neutral";

const toneText: Record<Tone, string> = {
  brand: "text-brand",
  ok: "text-ok",
  warn: "text-warn",
  bad: "text-bad",
  info: "text-info",
  neutral: "text-muted",
};

const toneBadge: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  neutral: "bg-surface-2 text-muted",
};

export const toneBg: Record<Tone, string> = {
  brand: "bg-brand",
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
  info: "bg-info",
  neutral: "bg-muted",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneBadge[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Page title with the logo's square marker. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-[1.7rem]">
          <span className="marker size-2.5" aria-hidden />
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 ps-[1.4rem] text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Key figures shown as one ruled strip (like a transcript header),
 * rather than a row of floating tiles.
 */
export function StatStrip({
  items,
}: {
  items: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; tone?: Tone }[];
}) {
  return (
    <dl
      className={clsx(
        "card grid grid-cols-2 [&>div]:border-line",
        "max-lg:[&>div:nth-child(odd)]:border-e max-lg:[&>div:nth-child(-n+2)]:border-b",
        // An odd last tile spans the row on small screens instead of leaving an empty cell.
        "max-lg:[&>div:last-child:nth-child(odd)]:col-span-2 max-lg:[&>div:last-child:nth-child(odd)]:border-e-0",
        "lg:[&>div:not(:last-child)]:border-e",
        { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }[items.length] ?? "lg:grid-cols-4",
      )}
    >
      {items.map(({ label, value, hint, icon: Icon, tone = "brand" }) => (
        <div key={label} className="p-4 sm:p-5">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted sm:text-sm">
            <Icon className={clsx("size-4", toneText[tone])} aria-hidden />
            {label}
          </dt>
          <dd className="mt-2 text-2xl font-bold tracking-tight sm:text-[1.75rem]">{value}</dd>
          {hint && <dd className="mt-0.5 text-xs text-muted">{hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ value, max, tone = "brand", label }: { value: number; max: number; tone?: Tone; label: string }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2 w-full overflow-hidden rounded-sm bg-surface-2"
    >
      <div className={clsx("h-full rounded-sm transition-[width] duration-500", toneBg[tone])} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function ProgressRing({ percent, size = 120, label, children }: { percent: number; size?: number; label: string; children?: ReactNode }) {
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${clamped}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-surface-2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className="stroke-brand transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <Icon className="size-8 text-muted/70" strokeWidth={1.5} aria-hidden />
      <p className="mt-1 font-semibold">{title}</p>
      {body && <p className="max-w-sm text-sm leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3.5 sm:px-5">
      <h2 className="flex items-center gap-2.5 font-semibold">
        <span className="marker" aria-hidden />
        {children}
      </h2>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-28 rounded-lg" />
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}
