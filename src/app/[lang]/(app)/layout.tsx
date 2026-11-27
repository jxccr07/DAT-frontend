import { Suspense } from "react";
import Link from "next/link";
import { format, getDictionary, getLocale, type Dictionary, type Locale } from "@/i18n";
import { Mail } from "lucide-react";
import { getMe } from "@/lib/dal";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { LanguageSwitch } from "@/components/language-switch";
import { HeaderNav, MobileTabBar } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";
import { ScrollTop } from "@/components/scroll-top";

export default async function AppLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollTop />
      <header className="no-print sticky top-0 z-30 bg-navy text-navy-fg dark:border-b dark:border-line [&_:focus-visible]:outline-white">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:gap-8 lg:px-8">
          <Link href={`/${locale}`} className="flex shrink-0 items-center gap-3" aria-label={dict.common.homeLink}>
            <Logo variant="mark" onDark alt={dict.meta.title} className="h-7 w-auto" priority />
            <span className="hidden h-6 w-px bg-white/25 sm:block" aria-hidden />
            <Suspense fallback={<span className="hidden text-sm leading-tight font-medium text-white/85 sm:block">{dict.common.portal}</span>}>
              <PortalLabel dict={dict} />
            </Suspense>
          </Link>

          <Suspense fallback={<div className="hidden flex-1 lg:block" />}>
            <RoleNav locale={locale} dict={dict} placement="header" />
          </Suspense>

          <div className="ms-auto flex items-center gap-1">
            <LanguageSwitch
              locale={locale}
              label={dict.common.language}
              title={dict.common.switchLanguage}
              className="text-white/85 hover:bg-white/10 hover:text-white"
            />
            <ThemeToggle labels={dict.common.theme} className="text-white/85 hover:bg-white/10 hover:text-white" />
            <span className="mx-1 h-6 w-px bg-white/20" aria-hidden />
            <Suspense fallback={<span className="size-9 animate-pulse rounded-md bg-white/10" />}>
              <HeaderUser locale={locale} dict={dict} />
            </Suspense>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
        {children}
      </main>

      <Suspense fallback={null}>
        <RoleNav locale={locale} dict={dict} placement="mobile" />
      </Suspense>
    </div>
  );
}

async function HeaderUser({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const me = await getMe();
  return (
    <>
      {me.role === "student" && (
        <Link
          href={`/${locale}/messages`}
          className="relative inline-grid size-9 place-items-center rounded-md text-white/85 hover:bg-white/10 hover:text-white"
          aria-label={me.unread_messages > 0 ? `${dict.messages.bell} · ${format(dict.messages.unread, { n: me.unread_messages })}` : dict.messages.bell}
        >
          <Mail className="size-[18px]" aria-hidden />
          {me.unread_messages > 0 && (
            <span className="absolute -top-0.5 -end-0.5 grid min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] leading-4 font-bold text-white">
              {me.unread_messages}
            </span>
          )}
        </Link>
      )}
      <UserMenu
      locale={locale}
      name={me.full_name}
      studentId={me.student_id}
      labels={{ ...dict.nav, cancel: dict.common.cancel }}
      role={me.role}
    />
    </>
  );
}

async function RoleNav({ locale, dict, placement }: { locale: Locale; dict: Dictionary; placement: "header" | "mobile" }) {
  const me = await getMe();
  return placement === "header" ? (
    <HeaderNav locale={locale} labels={dict.nav} role={me.role} />
  ) : (
    <MobileTabBar locale={locale} labels={dict.nav} role={me.role} />
  );
}

async function PortalLabel({ dict }: { dict: Dictionary }) {
  const me = await getMe();
  return (
    <span className="hidden text-sm leading-tight font-medium text-white/85 sm:block">
      {me.role === "advisor" ? dict.common.advisorPortal : dict.common.portal}
    </span>
  );
}
