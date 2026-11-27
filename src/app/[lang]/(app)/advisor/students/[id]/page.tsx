import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, Mail, Phone } from "lucide-react";
import { getDictionary, getLocale, type Dictionary, type Locale } from "@/i18n";
import { getAdvisorStudent, requireRole } from "@/lib/dal";
import { DraftMessage } from "@/components/advising/draft-message";
import { MessageThread } from "@/components/advising/message-thread";
import { firstName, parseApiDate } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { Badge, PageSkeleton, SectionTitle } from "@/components/ui/primitives";
import { TwinStatusCard } from "@/components/twin/status-card";
import { AlertList } from "@/components/advising/alert-list";
import { NoteForm } from "@/components/advising/note-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).advisor.studentTitle };
}

export default async function AdvisorStudentPage({ params }: PageProps<"/[lang]/advisor/students/[id]">) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StudentFile locale={locale} dict={dict} params={params} />
    </Suspense>
  );
}

async function StudentFile({ locale, dict, params }: { locale: Locale; dict: Dictionary; params: Promise<{ id: string }> }) {
  const me = await requireRole("advisor");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const file = await getAdvisorStudent(id).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const t = dict.advisor;
  const s = file.student;
  // Draft a follow-up for the newest open alert (or the newest one if all are seen).
  const draftFor = file.alerts.find((a) => a.seen_at === null) ?? file.alerts[0];
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <Link href={`/${locale}/advisor`} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
        <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
        {t.back}
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{t.studentTitle}</p>
          <h1 dir="auto" className="mt-0.5 text-2xl font-bold tracking-tight">
            {s.full_name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            <span dir="ltr">{s.student_id}</span>
            {s.major && <> · {s.major}</>}
            {s.study_year && <> · {dict.dashboard.yearLabel} {s.study_year}</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href={`mailto:${s.email}`} className="btn-outline h-9 px-3">
            <Mail className="size-4" aria-hidden />
            <span dir="ltr">{s.email}</span>
          </a>
          <a href={`tel:${s.phone_number}`} className="btn-outline h-9 px-3">
            <Phone className="size-4" aria-hidden />
            <span dir="ltr">{s.phone_number}</span>
          </a>
        </div>
      </header>

      <TwinStatusCard status={file.twin} locale={locale} t={dict.twin} units={dict.common.units} standing={t.standing} />

      {draftFor && (
        <DraftMessage
          key={draftFor.id}
          alert={draftFor}
          student={{ id: s.id, full_name: s.full_name, email: s.email }}
          advisorName={me.full_name}
          whatWorked={file.twin.cohort?.what_worked ?? []}
          locale={locale}
          t={t}
          errors={dict.errors}
          units={dict.common.units}
        />
      )}

      <section className="card">
        <SectionTitle>{dict.messages.conversation}</SectionTitle>
        <MessageThread
          messages={file.messages}
          viewer="advisor"
          studentId={s.id}
          otherName={firstName(s.full_name)}
          locale={locale}
          t={dict.messages}
          errors={dict.errors}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <SectionTitle>{t.studentAlerts}</SectionTitle>
          <AlertList alerts={file.alerts} locale={locale} t={t} errors={dict.errors} units={dict.common.units} showStudent={false} emptyText={t.studentAlertsEmpty} />
        </section>

        <section className="card">
          <SectionTitle>{t.notesTitle}</SectionTitle>
          <NoteForm studentId={s.id} locale={locale} t={t} errors={dict.errors} />
          {file.notes.length === 0 ? (
            <p className="p-5 text-sm text-muted">{t.notesEmpty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {file.notes.map((note) => (
                <li key={note.id} className="space-y-1.5 px-5 py-4">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>{dateFmt.format(parseApiDate(note.created_at))}</span>
                    {Boolean(note.contacted) && <Badge tone="ok">{t.contactedBadge}</Badge>}
                  </div>
                  <p dir="auto" className="text-sm whitespace-pre-line">
                    {note.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
