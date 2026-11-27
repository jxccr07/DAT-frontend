import type { Metadata } from "next";
import { qty } from "@/i18n/plural";
import { Suspense } from "react";
import { CalendarX2, FlaskConical, MapPin, Presentation } from "lucide-react";
import clsx from "clsx";
import { getDictionary, getLocale, type Dictionary } from "@/i18n";
import { getSchedule, requireRole } from "@/lib/dal";
import { Badge, EmptyState, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import type { ScheduleEntry } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.schedule };
}

export default async function SchedulePage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return (
    <>
      <PageHeader title={dict.schedule.title} subtitle={dict.schedule.subtitle} />
      <Suspense fallback={<PageSkeleton />}>
        <ScheduleView dict={dict} />
      </Suspense>
    </>
  );
}

const TIME_SLOTS = ["08:00 - 09:50", "10:00 - 11:50", "12:00 - 13:50", "14:00 - 15:50"];

async function ScheduleView({ dict }: { dict: Dictionary }) {
  await requireRole("student");
  const schedule = await getSchedule();
  const t = dict.schedule;
  const entries = schedule.schedule_entries;
  // Sunday = 0 in both JS and the university week.
  const today = new Date().getDay();

  if (entries.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={CalendarX2} title={t.empty} />
      </div>
    );
  }

  const at = (day: number, time: string) => entries.find((e) => e.day_index === day && e.time === time);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {schedule.semester && <Badge tone="brand">{schedule.semester.name}</Badge>}
        <Badge>
          {schedule.summary.courses_count} · {qty(dict.common.units, "hours", schedule.summary.total_hours)}
        </Badge>
        <Badge tone="info">
          {t.studyDays}: {schedule.summary.study_days_count}
        </Badge>
      </div>

      {/* Desktop / tablet: weekly grid */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
          <caption className="sr-only">{t.title}</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="w-32 p-3 text-start font-medium text-muted">
                {t.time}
              </th>
              {t.days.map((day, i) => (
                <th key={day} scope="col" className={clsx("p-3 text-center font-semibold", i === today && "text-brand")}>
                  {day}
                  {i === today && <span className="ms-1.5 rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px]">{t.today}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot) => (
              <tr key={slot} className="border-b border-line last:border-0">
                <th scope="row" className="p-3 text-start font-normal whitespace-nowrap text-muted">
                  <SlotTime slot={slot} to={t.to} />
                </th>
                {t.days.map((day, i) => {
                  const entry = at(i, slot);
                  return (
                    <td key={day} className={clsx("h-28 p-1.5 align-top", i === today && "bg-brand-soft/30")}>
                      {entry && <LectureCard entry={entry} dict={dict} />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: agenda by day */}
      <div className="space-y-4 md:hidden">
        {t.days.map((day, i) => {
          const dayEntries = entries.filter((e) => e.day_index === i).sort((a, b) => a.time.localeCompare(b.time));
          if (dayEntries.length === 0) return null;
          return (
            <section key={day} className="card overflow-hidden">
              <h2 className={clsx("flex items-center gap-2 border-b border-line px-4 py-2.5 font-semibold", i === today && "text-brand")}>
                {day}
                {i === today && <Badge tone="brand">{t.today}</Badge>}
              </h2>
              <ul className="space-y-2 p-2">
                {dayEntries.map((entry) => (
                  <li key={entry.record_id} className="flex gap-3">
                    <span className="flex w-14 shrink-0 flex-col pt-2 text-xs text-muted">
                      <bdi>{entry.time.split(" - ")[0]}</bdi>
                      <bdi className="text-[11px] opacity-75">{entry.time.split(" - ")[1]}</bdi>
                    </span>
                    <div className="flex-1">
                      <LectureCard entry={entry} dict={dict} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function LectureCard({ entry, dict }: { entry: ScheduleEntry; dict: Dictionary }) {
  const t = dict.schedule;
  const Icon = entry.is_lab ? FlaskConical : Presentation;
  return (
    <article
      className={clsx(
        "h-full rounded-md border-s-4 p-2.5 text-start",
        entry.is_lab ? "border-warn bg-warn-soft/60" : "border-brand bg-brand-soft/60",
      )}
    >
      <p className="line-clamp-2 text-xs leading-snug font-semibold">{entry.name}</p>
      <p className="mt-1 text-[11px] text-muted" dir="ltr">
        {entry.code} · {t.section} {entry.section}
      </p>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
        <Icon className="size-3" aria-hidden />
        {entry.is_lab ? t.lab : t.theory}
        <MapPin className="ms-1 size-3" aria-hidden />
        <span dir="ltr">{entry.room_code}</span>
      </p>
    </article>
  );
}

/** "08:00 to 09:50" with each time isolated, so the order reads correctly in Arabic and English. */
function SlotTime({ slot, to }: { slot: string; to: string }) {
  const [start, end] = slot.split(" - ");
  return (
    <>
      <bdi>{start}</bdi> {to} <bdi>{end}</bdi>
    </>
  );
}
