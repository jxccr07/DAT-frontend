import { getDictionary, getLocale } from "@/i18n";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { LanguageSwitch } from "@/components/language-switch";

/** Shared frame for sign-in and create-account: logo on top, one centered form. */
export default async function AuthLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Brand strip: navy with a blue segment, echoing the logo */}
      <div className="flex h-1.5" aria-hidden>
        <span className="flex-1 bg-navy dark:bg-line" />
        <span className="w-24 bg-brand" />
      </div>

      <div className="flex items-center justify-end gap-1 px-4 pt-3 sm:px-6">
        <LanguageSwitch
          locale={locale}
          label={dict.common.language}
          title={dict.common.switchLanguage}
          className="text-muted hover:bg-surface-2 hover:text-fg"
        />
        <ThemeToggle labels={dict.common.theme} className="text-muted hover:bg-surface-2 hover:text-fg" />
      </div>

      <main id="main" className="flex flex-1 flex-col items-center px-4 pt-4 pb-12 sm:pt-8">
        <div className="w-full max-w-[26rem]">
          <div className="mb-8 flex justify-center">
            <Logo variant="full" alt={dict.meta.title} className="h-auto w-48 sm:w-56" priority />
          </div>
          {children}
        </div>
      </main>

      <footer className="px-4 pb-6 text-center text-xs text-muted">
        {dict.common.portal} · {dict.meta.title}
      </footer>
    </div>
  );
}
