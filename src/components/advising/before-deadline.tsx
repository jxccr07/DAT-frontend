"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarClock, Check, Hand, Loader2, MessageSquareText, Send, X } from "lucide-react";
import clsx from "clsx";
import { addNoteAction, sendAdvisorMessageAction } from "@/lib/actions";
import { format, type Dictionary, type Locale } from "@/i18n/types";
import { qty, type Units } from "@/i18n/plural";
import { firstName } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { Badge, SectionTitle } from "@/components/ui/primitives";
import { pct } from "@/components/twin/twin-format";
import type { DeadlineList, DeadlineReason } from "@/lib/types";

type T = Dictionary["advisor"];
type Row = DeadlineList["students"][number];
type Props = { list: DeadlineList; advisorName: string; locale: Locale; t: T; errors: Dictionary["errors"]; units: Units };

const capped = (v: number, over: string) => (v >= 0.955 ? over : pct(v));

/**
 * "Talk to them before the drop deadline": the list suggests, the advisor decides.
 * Each row says why, offers a draft built only from these numbers, and can be set aside with a reason.
 */
export function BeforeDeadline({ list, advisorName, locale, t, errors, units }: Props) {
  const d = t.deadline;
  const daysLeft = list.days_left;
  const date = list.deadline
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { weekday: "long", day: "numeric", month: "long" }).format(
        new Date(`${list.deadline}T12:00:00`),
      )
    : null;
  const soon = daysLeft != null && daysLeft <= 14;

  return (
    <section className={clsx("card", soon && "border-warn/50")} aria-labelledby="deadline-title">
      <SectionTitle action={list.total > 0 ? <Badge tone={soon ? "warn" : "brand"}>{list.total}</Badge> : undefined}>
        <span id="deadline-title">{d.title}</span>
      </SectionTitle>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-5 py-3 text-sm">
        {daysLeft != null && date && (
          <span className={clsx("flex items-center gap-1.5 font-semibold", soon ? "text-warn" : "text-fg")}>
            <CalendarClock className="size-4 shrink-0" aria-hidden />
            {daysLeft === 0 ? format(d.today, { date }) : format(d.daysLeft, { days: qty(units, "days", daysLeft), date })}
          </span>
        )}
        {list.total > 0 && (
          <span className="text-xs text-muted">
            {format(d.showing, { n: Math.min(list.total, list.daily_cap), total: list.total })}
          </span>
        )}
      </div>
      <p className="px-5 pt-3 text-xs text-muted">{format(d.body, { days: qty(units, "days", list.quiet_days) })}</p>

      {list.students.length === 0 ? (
        <p className="p-5 text-sm text-muted">{daysLeft != null && daysLeft < 0 ? d.passed : d.empty}</p>
      ) : (
        <ol className="divide-y divide-line">
          {list.students.map((row, i) => (
            <DeadlineRow key={row.id} row={row} rank={i + 1} daysLeft={daysLeft} advisorName={advisorName} locale={locale} t={t} errors={errors} units={units} />
          ))}
        </ol>
      )}
    </section>
  );
}

function DeadlineRow({ row, rank, daysLeft, advisorName, locale, t, errors, units }: { row: Row; rank: number; daysLeft: number | null; advisorName: string } & Omit<Props, "list">) {
  const d = t.deadline;
  const [mode, setMode] = useState<"idle" | "draft" | "skip">("idle");
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<null | "sent" | "skipped">(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const fail = (code: string) => toast("error", (errors as Record<string, string>)[code] ?? errors.unknown);

  const openDraft = () => {
    setText(buildDraft(row, daysLeft, advisorName, t, units));
    setMode("draft");
  };

  const send = () =>
    start(async () => {
      const result = await sendAdvisorMessageAction({ studentId: row.id, body: text }, locale);
      if (result.ok) {
        setDone("sent");
        toast("success", d.sent);
      } else fail(result.code);
    });

  const skip = () =>
    start(async () => {
      const body = format(d.skipNote, { course: row.course?.name ?? "—", reason: reason.trim() });
      const result = await addNoteAction({ studentId: row.id, body, contacted: false }, locale);
      if (result.ok) {
        setDone("skipped");
        toast("success", d.skipped);
      } else fail(result.code);
    });

  return (
    <li className={clsx("space-y-3 px-5 py-4", done && "opacity-60")}>
      <div className="flex items-start gap-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-[4px] bg-navy text-xs font-bold text-navy-fg dark:bg-brand dark:text-brand-fg">{rank}</span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/${locale}/advisor/students/${row.id}`} className="font-semibold hover:text-brand hover:underline">
              <span dir="auto">{row.full_name}</span>
            </Link>
            {row.requested && (
              <Badge tone="brand">
                <Hand className="size-3" aria-hidden />
                {d.requestedBadge}
              </Badge>
            )}
            {row.gpa != null && <span className="text-xs text-muted">{format(d.gpa, { gpa: row.gpa.toFixed(2) })}</span>}
          </p>
          {row.course && (
            <p className="text-sm">
              <span className="text-muted">{d.course}: </span>
              <span dir="auto" className="font-medium">{row.course.name}</span>{" "}
              <span className="text-xs text-muted" dir="ltr">{row.course.code}</span>
            </p>
          )}
          <ul className="space-y-0.5 text-xs text-muted">
            {row.reasons.map((r) => (
              <li key={r.code} className={clsx(r.code === "requested" && "font-medium text-brand", r.code === "drop_cost" && "text-fg")}>
                {reasonText(r, t, units)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {done ? (
        <p className="flex items-center gap-1.5 ps-9 text-xs font-medium text-ok">
          <Check className="size-3.5" aria-hidden />
          {done === "sent" ? d.sent : d.skipped}
        </p>
      ) : mode === "idle" ? (
        <div className="flex flex-wrap gap-2 ps-9">
          <button type="button" className="btn-navy h-11 px-3 text-xs sm:h-9" onClick={openDraft}>
            <MessageSquareText className="size-3.5" aria-hidden />
            {d.draft}
          </button>
          <button type="button" className="btn-ghost h-11 px-3 text-xs sm:h-9" onClick={() => setMode("skip")}>
            <X className="size-3.5" aria-hidden />
            {d.skip}
          </button>
        </div>
      ) : mode === "draft" ? (
        <div className="space-y-2 ps-9">
          <p className="text-xs text-muted">{d.draftHint}</p>
          <label htmlFor={`deadline-draft-${row.id}`} className="sr-only">
            {d.draft}
          </label>
          <textarea
            id={`deadline-draft-${row.id}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            dir="auto"
            className="input h-auto py-2.5 text-sm leading-relaxed"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-navy h-11 px-3 text-xs sm:h-9" onClick={send} disabled={pending || !text.trim()}>
              {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Send className="size-3.5 rtl:rotate-180" aria-hidden />}
              {d.send}
            </button>
            <button type="button" className="btn-ghost h-11 px-3 text-xs sm:h-9" onClick={() => setMode("idle")} disabled={pending}>
              {d.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 ps-9">
          <label htmlFor={`deadline-skip-${row.id}`} className="text-xs font-medium">
            {d.skipLabel}
          </label>
          <input
            id={`deadline-skip-${row.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={d.skipPlaceholder}
            maxLength={300}
            dir="auto"
            className="input h-11 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline h-11 px-3 text-xs sm:h-9" onClick={skip} disabled={pending || !reason.trim()}>
              {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
              {d.skipSave}
            </button>
            <button type="button" className="btn-ghost h-11 px-3 text-xs sm:h-9" onClick={() => setMode("idle")} disabled={pending}>
              {d.cancel}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function reasonText(r: DeadlineReason, t: T, units: Units) {
  const d = t.deadline.reason;
  switch (r.code) {
    case "requested":
      return d.requested;
    case "drop_cost":
      return format(d.drop_cost, { a: capped(r.a, t.riskOver), b: capped(r.b, t.riskOver), n: qty(units, "students", r.n) });
    case "below_min":
      return format(d.below_min, { hours: qty(units, "hours", r.hours), min: qty(units, "hours", r.min) });
    case "fail_rate":
      return format(d.fail_rate, { p: pct(r.p) });
    case "failed":
      return format(d.failed, { count: r.count });
  }
}

/** A message built only from the numbers on screen; the advisor edits it and decides whether to send. */
function buildDraft(row: Row, daysLeft: number | null, advisorName: string, t: T, units: Units) {
  const d = t.deadline.message;
  const course = row.course?.name ?? "";
  const lines = [format(d.greeting, { name: firstName(row.full_name) }), ""];
  const body: string[] = [];
  if (row.requested) body.push(d.thanks);
  body.push(daysLeft != null && daysLeft >= 0 ? format(d.opening, { course, days: qty(units, "days", daysLeft) }) : format(d.openingNoDate, { course }));
  for (const r of row.reasons) {
    if (r.code === "drop_cost") body.push(format(d.dropCost, { course, a: capped(r.a, t.riskOver), b: capped(r.b, t.riskOver) }));
    if (r.code === "below_min") body.push(format(d.belowMin, { hours: qty(units, "hours", r.hours), min: qty(units, "hours", r.min) }));
    if (r.code === "fail_rate") body.push(format(d.failRate, { p: pct(r.p) }));
  }
  lines.push(body.join(" "), "", d.invite, "", format(d.signature, { advisor: advisorName }));
  return lines.join("\n");
}
