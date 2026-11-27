"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { addNoteAction } from "@/lib/actions";
import type { Dictionary, Locale } from "@/i18n/types";
import { useToast } from "@/components/ui/toast";

type Props = { studentId: number; locale: Locale; t: Dictionary["advisor"]; errors: Dictionary["errors"] };

/** Follow-up note; ticking "contacted" also closes the student's open alerts. */
export function NoteForm({ studentId, locale, t, errors }: Props) {
  const [body, setBody] = useState("");
  const [contacted, setContacted] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    start(async () => {
      const result = await addNoteAction({ studentId, body, contacted }, locale);
      if (result.ok) {
        setBody("");
        setContacted(false);
        toast("success", t.noteSaved);
      } else {
        toast("error", (errors as Record<string, string>)[result.code] ?? errors.unknown);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3 border-b border-line p-5">
      <label htmlFor="note-body" className="sr-only">
        {t.notesTitle}
      </label>
      <textarea
        id="note-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t.notePlaceholder}
        maxLength={2000}
        rows={3}
        required
        dir="auto"
        className="input h-auto min-h-20 py-2.5"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={contacted} onChange={(e) => setContacted(e.target.checked)} className="size-4 accent-[var(--brand)]" />
          {t.contacted}
        </label>
        <button type="submit" className="btn-navy h-9 px-4 text-sm" disabled={pending || !body.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4 rtl:rotate-180" aria-hidden />}
          {pending ? t.saving : t.saveNote}
        </button>
      </div>
    </form>
  );
}
