import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import { dirOf, getDictionary, getLocale, locales } from "@/i18n";
import { ThemeScript, ThemeSync } from "@/components/theme";
import { ToastProvider } from "@/components/ui/toast";
import "../globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex", display: "swap" });

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  const locale = await getLocale();
  return {
    title: { default: dict.meta.title, template: `%s · ${dict.meta.title}` },
    description: dict.meta.description,
    applicationName: dict.meta.title,
    // Private student portal: keep it out of search engines.
    robots: { index: false, follow: false },
    alternates: { languages: { ar: "/ar", en: "/en" } },
    openGraph: { title: dict.meta.title, description: dict.meta.description, locale, type: "website" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1e2f52" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1120" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return (
    <html lang={locale} dir={dirOf(locale)} className={`${plexArabic.variable} ${plex.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh">
        <ThemeSync />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-fg"
        >
          {dict.common.skipToContent}
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
