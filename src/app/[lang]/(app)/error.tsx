"use client";

import { useParams } from "next/navigation";
import { AlertOctagon, RotateCcw } from "lucide-react";
import ar from "@/i18n/ar";
import en from "@/i18n/en";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  const { lang } = useParams<{ lang: string }>();
  const t = (lang === "en" ? en : ar).errors;
  const network = error instanceof Error && error.message.includes("API unreachable");

  return (
    <div className="card mx-auto mt-10 flex max-w-md flex-col items-center gap-3 p-8 text-center" role="alert">
      <span className="grid size-12 place-items-center rounded-lg bg-bad-soft text-bad">
        <AlertOctagon className="size-6" aria-hidden />
      </span>
      <h1 className="text-lg font-semibold">{t.pageTitle}</h1>
      <p className="text-sm text-muted">{network ? t.network : t.pageBody}</p>
      <button type="button" className="btn-primary mt-2" onClick={() => retry()}>
        <RotateCcw className="size-4" aria-hidden />
        {(lang === "en" ? en : ar).common.retry}
      </button>
    </div>
  );
}
