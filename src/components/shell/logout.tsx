"use client";

import { useRef, useTransition, type Ref } from "react";
import { Loader2, LogOut } from "lucide-react";
import clsx from "clsx";
import { logoutAction } from "@/lib/actions";
import type { Dictionary, Locale } from "@/i18n/types";

export type LogoutLabels = Pick<Dictionary["nav"], "logout" | "logoutConfirmTitle" | "logoutConfirmBody" | "logoutConfirm"> & {
  cancel: string;
};

/** Confirmation dialog for signing out. Open it with `ref.current.showModal()`. */
export function LogoutDialog({
  locale,
  labels,
  ref,
  portal = "student",
}: {
  locale: Locale;
  labels: LogoutLabels;
  ref: Ref<HTMLDialogElement>;
  /** Which sign-in page to return to afterwards. */
  portal?: "student" | "advisor";
}) {
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const data = new FormData();
      data.set("lang", locale);
      data.set("portal", portal);
      const { to } = await logoutAction(data);
      // Full reload (replace, so Back can't return to the signed-in page): wipes every page kept in memory.
      window.location.replace(to);
    });

  return (
    <dialog
      ref={ref}
      aria-labelledby="logout-title"
      aria-describedby="logout-body"
      className="m-auto w-[min(24rem,calc(100%-2rem))] rounded-lg border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-navy/60"
    >
      <div className="p-6">
        <h2 id="logout-title" className="flex items-center gap-2.5 text-lg font-semibold">
          <span className="marker" aria-hidden />
          {labels.logoutConfirmTitle}
        </h2>
        <p id="logout-body" className="mt-2 text-sm text-muted">
          {labels.logoutConfirmBody}
        </p>
        <form method="dialog" className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* Cancel gets focus first, so Enter/Space never signs out by accident */}
          <button type="submit" className="btn-outline" autoFocus>
            {labels.cancel}
          </button>
          <button type="button" className="btn-navy" onClick={confirm} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {labels.logoutConfirm}
          </button>
        </form>
      </div>
    </dialog>
  );
}

/** Standalone sign-out button (asks for confirmation first). */
export function LogoutButton({ locale, labels, className }: { locale: Locale; labels: LogoutLabels; className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={clsx("flex w-full items-center gap-2.5 text-bad", className)}
      >
        <LogOut className="size-4 rtl:rotate-180" aria-hidden />
        {labels.logout}
      </button>
      <LogoutDialog ref={dialogRef} locale={locale} labels={labels} />
    </>
  );
}
