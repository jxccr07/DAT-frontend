"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Info, LogOut, UserRound } from "lucide-react";
import type { Dictionary, Locale } from "@/i18n/types";
import { firstName, initials } from "@/lib/format";
import { LogoutDialog } from "./logout";

type Props = {
  locale: Locale;
  name: string;
  studentId: string;
  labels: Dictionary["nav"] & { cancel: string };
  role?: "student" | "advisor";
};

/** Account menu in the header: who is signed in, profile, sign out. */
export function UserMenu({ locale, name, studentId, labels, role = "student" }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const logoutRef = useRef<HTMLDialogElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${labels.account}: ${name}`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-md ps-1 pe-2 text-navy-fg transition-colors hover:bg-white/10"
      >
        <span className="grid size-7 place-items-center rounded-[5px] bg-brand text-[11px] font-semibold text-white" aria-hidden>
          {initials(name)}
        </span>
        <span dir="auto" className="hidden max-w-36 truncate text-sm font-medium md:block">
          {firstName(name)}
        </span>
        <ChevronDown className="size-4 opacity-70" aria-hidden />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute end-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-line bg-surface text-fg shadow-lg"
        >
          <div className="border-b border-line px-4 py-3">
            <p dir="auto" className="truncate text-sm font-semibold">
              {name}
            </p>
            <p className="text-xs text-muted" dir="ltr" style={{ textAlign: "start" }}>
              {studentId}
            </p>
          </div>
          <div className="p-1.5">
            {role === "student" && (
              <Link
                href={`/${locale}/profile`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-surface-2"
              >
                <UserRound className="size-4 text-muted" aria-hidden />
                {labels.profile}
              </Link>
            )}
            {role === "student" && (
              <Link
                href={`/${locale}/twin`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-surface-2"
              >
                <Info className="size-4 text-muted" aria-hidden />
                {labels.twin}
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logoutRef.current?.showModal();
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-bad hover:bg-bad-soft"
            >
              <LogOut className="size-4 rtl:rotate-180" aria-hidden />
              {labels.logout}
            </button>
          </div>
        </div>
      )}
      <LogoutDialog ref={logoutRef} locale={locale} labels={labels} portal={role} />
    </div>
  );
}
