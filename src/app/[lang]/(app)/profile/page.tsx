import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary, getLocale, type Dictionary, type Locale } from "@/i18n";
import { getMe } from "@/lib/dal";
import { PageHeader, PageSkeleton, SectionTitle } from "@/components/ui/primitives";
import { LogoutButton } from "@/components/shell/logout";
import { initials } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.profile };
}

export default async function ProfilePage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return (
    <>
      <PageHeader title={dict.profile.title} />
      <Suspense fallback={<PageSkeleton />}>
        <Profile locale={locale} dict={dict} />
      </Suspense>
    </>
  );
}

function Field({ label, value, ltr }: { label: string; value?: string | number | null; ltr?: boolean }) {
  return (
    <div className="border-line px-4 py-3.5 sm:px-5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-medium" dir={ltr ? "ltr" : "auto"} style={{ textAlign: "start" }}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

async function Profile({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const me = await getMe();
  const t = dict.profile;
  const plan = me.academic_plan;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="card overflow-hidden">
        <div className="h-16 bg-navy" aria-hidden />
        <div className="-mt-8 flex flex-col items-center gap-3 px-6 pb-6 text-center">
          <span className="grid size-16 place-items-center rounded-md border-4 border-surface bg-brand text-lg font-semibold text-white" aria-hidden>
            {initials(me.full_name)}
          </span>
          <div>
            <p dir="auto" className="text-lg font-bold">
              {me.full_name}
            </p>
            <p className="text-sm text-muted" dir="ltr">
              {me.student_id}
            </p>
          </div>
          {plan && <p className="text-sm text-muted">{plan.major}</p>}
        </div>
        <div className="border-t border-line p-2">
          <LogoutButton
            locale={locale}
            labels={{ ...dict.nav, cancel: dict.common.cancel }}
            className="justify-center rounded-md px-3 py-2.5 text-sm font-medium hover:bg-bad-soft"
          />
        </div>
      </section>

      <div className="space-y-6 lg:col-span-2">
        <section className="card">
          <SectionTitle>{t.personal}</SectionTitle>
          <dl className="grid sm:grid-cols-2 [&>div]:border-b sm:[&>div:nth-child(odd)]:border-e sm:[&>div:nth-last-child(-n+2)]:border-b-0 max-sm:[&>div:last-child]:border-b-0">
            <Field label={t.fullName} value={me.full_name} />
            <Field label={t.studentId} value={me.student_id} ltr />
            <Field label={t.email} value={me.email} ltr />
            <Field label={t.phone} value={me.phone_number} ltr />
          </dl>
        </section>
        <section className="card">
          <SectionTitle>{t.academic}</SectionTitle>
          <dl className="grid sm:grid-cols-2 [&>div]:border-b sm:[&>div:nth-child(odd)]:border-e max-sm:[&>div:last-child]:border-b-0 sm:[&>div:last-child]:border-b-0">
            <Field label={t.college} value={plan?.college} />
            <Field label={t.major} value={plan?.major} />
            <Field label={t.program} value={plan?.program} />
            <Field label={t.planName} value={plan?.name} />
            <Field label={t.year} value={me.study_year} />
          </dl>
        </section>
      </div>
    </div>
  );
}
