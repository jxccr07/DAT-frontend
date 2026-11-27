import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).legal.title };
}

/** Terms of use and privacy, in plain language, including exactly what the advisor sees. */
export default async function TermsPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const t = dict.legal;
  return (
    <section className="card space-y-5 p-6 sm:p-8">
      <h1 className="flex items-center gap-2.5 text-xl font-bold">
        <span className="marker" aria-hidden />
        {t.title}
      </h1>
      {t.sections.map((section) => (
        <div key={section.heading}>
          <h2 className="text-sm font-semibold">{section.heading}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{section.body}</p>
        </div>
      ))}
      <Link href={`/${locale}/login`} className="inline-block text-sm font-semibold text-brand hover:underline">
        {t.back}
      </Link>
    </section>
  );
}
