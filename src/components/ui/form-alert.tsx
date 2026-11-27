import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import clsx from "clsx";
import type { ReactNode } from "react";

const tones = {
  bad: { icon: AlertCircle, className: "border-bad/30 bg-bad-soft text-bad", role: "alert" },
  warn: { icon: Info, className: "border-warn/30 bg-warn-soft text-warn", role: "status" },
  ok: { icon: CheckCircle2, className: "border-ok/30 bg-ok-soft text-ok", role: "status" },
} as const;

/** Inline message at the top of a form (announced to screen readers). */
export function FormAlert({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  const { icon: Icon, className, role } = tones[tone];
  return (
    <p role={role} className={clsx("flex items-start gap-2 rounded-md border px-3.5 py-2.5 text-sm", className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
