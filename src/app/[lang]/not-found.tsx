import Link from "next/link";
import { Compass } from "lucide-react";
import ar from "@/i18n/ar";

// Rendered for unknown paths inside a locale (falls back to Arabic copy + English).
export default function NotFound() {
  const t = ar.errors;
  return (
    <main id="main" className="grid min-h-dvh place-items-center p-6">
      <div className="card flex max-w-md flex-col items-center gap-3 p-8 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Compass className="size-6" aria-hidden />
        </span>
        <p className="text-5xl font-bold">404</p>
        <h1 className="text-lg font-semibold">
          {t.notFoundTitle} · Page not found
        </h1>
        <p className="text-sm text-muted">{t.notFoundBody}</p>
        <Link href="/" className="btn-primary mt-2">
          {t.backHome}
        </Link>
      </div>
    </main>
  );
}
