"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, ClipboardCopy, Loader2, Mail, MessageSquareText, NotebookPen, Send } from "lucide-react";
import { addNoteAction, sendAdvisorMessageAction } from "@/lib/actions";
import { format, type Dictionary, type Locale } from "@/i18n/types";
import { qty, type Units } from "@/i18n/plural";
import { firstName } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { pct } from "@/components/twin/twin-format";
import type { AdvisorAlert, WhatWorked } from "@/lib/types";

type Props = {
  alert: AdvisorAlert;
  student: { id: number; full_name: string; email: string };
  advisorName: string;
  whatWorked: WhatWorked[];
  locale: Locale;
  t: Dictionary["advisor"];
  errors: Dictionary["errors"];
  units: Units;
};

const capped = (v: number, over: string) => (v >= 0.955 ? over : pct(v));

/**
 * A ready-to-edit follow-up message built from the same numbers the student saw.
 * The system drafts; the advisor decides what to send (and logging it closes the alert).
 */
export function DraftMessage({ alert, student, advisorName, whatWorked, locale, t, errors, units }: Props) {
  const d = t.draft;
  const details = alert.details;
  const course = alert.course?.name ?? "";

  const initial = useMemo(() => {
    const lines = [format(d.greeting, { name: firstName(student.full_name) }), ""];
    const body = [format(d.dropped, { course })];
    if (details?.headline) {
      body.push(format(d.numbers, { a: capped(details.headline.delayed_with, t.riskOver), b: capped(details.headline.delayed_without, t.riskOver) }));
    }
    if (details?.below_min) {
      body.push(format(d.belowMin, { h: qty(units, "hours", details.hours_after), min: qty(units, "hours", details.min_hours) }));
    }
    lines.push(body.join(" "));
    if (whatWorked[0]) lines.push("", format(d.worked, { habit: d.habits[whatWorked[0].code] }));
    lines.push("", d.invite, "", format(d.signature, { advisor: advisorName }).replace("\\n", "\n"));
    return lines.join("\n");
  }, [d, t.riskOver, student.full_name, course, details, whatWorked, advisorName, units]);

  const [text, setText] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const mailto = `mailto:${student.email}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(text)}`;

  // Primary path: deliver inside the portal (the student sees it under "My messages").
  const sendInPortal = () =>
    start(async () => {
      const result = await sendAdvisorMessageAction({ studentId: student.id, body: text, alertId: alert.id }, locale);
      if (result.ok) {
        setLogged(true);
        toast("success", d.sentInPortal);
      } else {
        toast("error", (errors as Record<string, string>)[result.code] ?? errors.unknown);
      }
    });

  const logContact = () =>
    start(async () => {
      const result = await addNoteAction({ studentId: student.id, body: format(d.noteSummary, { course }), contacted: true }, locale);
      if (result.ok) {
        setLogged(true);
        toast("success", d.logged);
      } else {
        toast("error", (errors as Record<string, string>)[result.code] ?? errors.unknown);
      }
    });

  return (
    <section className="card">
      <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
        <MessageSquareText className="size-4 text-brand" aria-hidden />
        <h2 className="font-semibold">{d.title}</h2>
      </div>
      <div className="space-y-3 p-5">
        <p className="text-xs text-muted">{d.hint}</p>
        <label htmlFor={`draft-${alert.id}`} className="sr-only">
          {d.title}
        </label>
        <textarea
          id={`draft-${alert.id}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          dir="auto"
          className="input h-auto py-2.5 leading-relaxed"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-navy h-9 px-3 text-sm" onClick={sendInPortal} disabled={pending || logged || !text.trim()}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : logged ? <Check className="size-4" aria-hidden /> : <Send className="size-4 rtl:rotate-180" aria-hidden />}
            {logged ? d.sentInPortal : d.sendInPortal}
          </button>
          <button type="button" className="btn-outline h-9 px-3 text-sm" onClick={copy}>
            {copied ? <Check className="size-4 text-ok" aria-hidden /> : <ClipboardCopy className="size-4" aria-hidden />}
            {copied ? d.copied : d.copy}
          </button>
          <a href={mailto} className="btn-outline h-9 px-3 text-sm">
            <Mail className="size-4" aria-hidden />
            {d.email}
          </a>
          <button type="button" className="btn-ghost h-9 px-3 text-sm" onClick={logContact} disabled={pending || logged}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : logged ? <Check className="size-4" aria-hidden /> : <NotebookPen className="size-4" aria-hidden />}
            {d.logContact}
          </button>
        </div>
      </div>
    </section>
  );
}
