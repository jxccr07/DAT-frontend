import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getDictionary, getLocale } from "@/i18n";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.auth.title };
}

export default async function LoginPage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <>
      <section className="card p-6 sm:p-8">
        <h1 className="flex items-center gap-2.5 text-xl font-bold">
          <span className="marker" aria-hidden />
          {dict.auth.title}
        </h1>
        <p className="mt-1.5 mb-6 text-sm text-muted">{dict.auth.subtitle}</p>
        <Suspense>
          <LoginForm locale={locale} dict={{ auth: dict.auth, errors: dict.errors }} />
        </Suspense>
      </section>

      <p className="mt-6 text-center text-sm text-muted">
        {dict.auth.advisorQuestion}{" "}
        <Link href={`/${locale}/advisor-login`} className="font-semibold text-brand hover:underline">
          {dict.auth.advisorCta}
        </Link>
      </p>
    </>
  );
}
