import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary, getLocale, type Dictionary, type Locale } from "@/i18n";
import { getLightLoadDecision, getRegistration, requireRole } from "@/lib/dal";
import { PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { RegistrationBoard } from "./registration-board";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).nav.registration };
}

export default async function RegistrationPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  return (
    <>
      <PageHeader title={dict.registration.title} subtitle={dict.registration.subtitle} />
      <Suspense fallback={<PageSkeleton />}>
        <Board locale={locale} dict={dict} />
      </Suspense>
    </>
  );
}

async function Board({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  await requireRole("student");
  const [overview, lightDecision] = await Promise.all([getRegistration(), getLightLoadDecision().catch(() => null)]);
  return (
    <RegistrationBoard
      locale={locale}
      overview={overview}
      lightDecision={lightDecision}
      dict={{ registration: dict.registration, errors: dict.errors, common: dict.common, twin: dict.twin }}
    />
  );
}
