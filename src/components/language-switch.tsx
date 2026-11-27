"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { Locale } from "@/i18n/types";

type Props = { locale: Locale; label: string; title: string; className?: string };

/**
 * Same page in the other language. The current path is read in a Suspense
 * boundary (pages with dynamic segments stream it); until then it links to the
 * other language's home.
 */
export function LanguageSwitch(props: Props) {
  const target: Locale = props.locale === "ar" ? "en" : "ar";
  return (
    <Suspense fallback={<SwitchLink {...props} href={`/${target}`} target={target} />}>
      <CurrentPageSwitch {...props} target={target} />
    </Suspense>
  );
}

function CurrentPageSwitch(props: Props & { target: Locale }) {
  const pathname = usePathname();
  return <SwitchLink {...props} href={pathname.replace(/^\/(ar|en)(?=\/|$)/, `/${props.target}`)} />;
}

function SwitchLink({ label, title, className, href, target }: Props & { href: string; target: Locale }) {
  return (
    <Link
      href={href}
      hrefLang={target}
      lang={target}
      title={title}
      prefetch={false}
      className={clsx("inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors", className)}
    >
      {label}
    </Link>
  );
}
