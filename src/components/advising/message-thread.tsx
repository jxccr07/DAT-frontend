"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { parseApiDate } from "@/lib/format";
import { CheckCheck, Loader2, Send } from "lucide-react";
import clsx from "clsx";
import { sendAdvisorMessageAction, sendStudentMessageAction } from "@/lib/actions";
import type { Dictionary, Locale } from "@/i18n/types";
import { useToast } from "@/components/ui/toast";
import type { Message } from "@/lib/types";

type Props = {
  messages: Message[];
  /** Who is looking: their own messages sit on the "start" side. */
  viewer: "advisor" | "student";
  /** Required when the advisor is writing. */
  studentId?: number;
  otherName: string;
  locale: Locale;
  t: Dictionary["messages"];
  errors: Dictionary["errors"];
};

/** A simple student ↔ advisor conversation with a reply box. */
export function MessageThread({ messages, viewer, studentId, otherName, locale, t, errors }: Props) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const endRef = useRef<HTMLDivElement>(null);
  const timeFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const send = (event: React.FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    start(async () => {
      const result =
        viewer === "advisor" && studentId
          ? await sendAdvisorMessageAction({ studentId, body: text }, locale)
          : await sendStudentMessageAction({ body: text }, locale);
      if (result.ok) {
        setBody("");
        toast("success", t.sent);
      } else {
        toast("error", (errors as Record<string, string>)[result.code] ?? errors.unknown);
      }
    });
  };

  return (
    <div>
      <div className="max-h-[28rem] space-y-3 overflow-y-auto p-4 sm:p-5" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">{viewer === "advisor" ? t.conversationEmpty : t.empty}</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender === viewer;
            return (
              <div key={m.id} className={clsx("flex", mine ? "justify-start" : "justify-end")}>
                <div
                  className={clsx(
                    "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm",
                    mine ? "bg-brand-soft text-fg" : "border border-line bg-surface-2 text-fg",
                  )}
                >
                  <p className="mb-1 text-xs font-semibold text-muted">{mine ? t.you : otherName}</p>
                  <p dir="auto" className="leading-relaxed whitespace-pre-line">
                    {m.body}
                  </p>
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted">
                    {timeFmt.format(parseApiDate(m.created_at))}
                    {mine && m.read_at && (
                      <span className="inline-flex items-center gap-0.5 text-ok">
                        · <CheckCheck className="size-3" aria-hidden /> {t.seen}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3 sm:p-4">
        <label htmlFor={`msg-${viewer}`} className="sr-only">
          {t.placeholder}
        </label>
        <textarea
          id={`msg-${viewer}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t.placeholder}
          rows={2}
          maxLength={2000}
          dir="auto"
          className="input h-auto min-h-11 flex-1 py-2.5"
        />
        <button type="submit" className="btn-navy h-11 shrink-0 px-4" disabled={pending || !body.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4 rtl:rotate-180" aria-hidden />}
          <span className="max-sm:sr-only">{pending ? t.sending : t.send}</span>
        </button>
      </form>
    </div>
  );
}
