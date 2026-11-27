"use client";

import { useState } from "react";
import { Check, Copy, Mail, UserRound } from "lucide-react";
import clsx from "clsx";
import type { Dictionary } from "@/i18n/types";

type Props = {
  advisor: { full_name: string; email: string | null; department: string | null };
  t: Dictionary["messages"];
};

/** Who the student is writing to. Names repeat across advisors, so the email is shown to tell them apart. */
export function AdvisorCard({ advisor, t }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!advisor.email) return;
    try {
      await navigator.clipboard.writeText(advisor.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-5" aria-label={t.advisorCard}>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-navy text-navy-fg dark:bg-brand dark:text-brand-fg">
        <UserRound className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs text-muted">{t.advisorCard}</p>
        <p className="font-semibold" dir="auto">
          {advisor.full_name}
        </p>
        {advisor.department && (
          <p className="text-xs text-muted" dir="auto">
            {advisor.department}
          </p>
        )}
      </div>
      {advisor.email && (
        <div className="flex w-full min-w-0 items-center gap-1 rounded-[4px] border border-line bg-surface ps-2.5 pe-1 sm:w-auto">
          <Mail className="size-3.5 shrink-0 text-muted" aria-hidden />
          <span className="min-w-0 flex-1 truncate py-1.5 text-sm" dir="ltr">
            {advisor.email}
          </span>
          <button
            type="button"
            onClick={copy}
            title={copied ? t.copied : t.copyEmail}
            aria-label={copied ? t.copied : t.copyEmail}
            className={clsx(
              "grid size-8 shrink-0 place-items-center rounded-[4px] transition-colors",
              copied ? "text-ok" : "text-muted hover:bg-line/50 hover:text-fg",
            )}
          >
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          </button>
          <span className="sr-only" aria-live="polite">
            {copied ? t.copied : ""}
          </span>
        </div>
      )}
    </section>
  );
}
