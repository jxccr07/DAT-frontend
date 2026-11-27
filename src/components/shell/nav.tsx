"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, ClipboardList, GraduationCap, Home, Info, Users } from "lucide-react";
import clsx from "clsx";
import type { Dictionary, Locale } from "@/i18n/types";

// Task-based navigation (what students come to do), same order everywhere.
const studentItems = [
  { key: "dashboard", icon: Home },
  { key: "schedule", icon: CalendarDays },
  { key: "registration", icon: ClipboardList },
  { key: "plan", icon: BookOpen },
  { key: "grades", icon: GraduationCap },
] as const;

// Desktop has room for "How the twin works" too; the phone bar keeps the five tasks.
const studentDesktopItems = [...studentItems, { key: "twin", icon: Info }] as const;

const advisorItems = [
  { key: "advisor", icon: Users },
  { key: "twin", icon: Info },
] as const;

type Role = "student" | "advisor";
const itemsFor = (role: Role) => (role === "advisor" ? advisorItems : studentItems);

type NavLabels = Dictionary["nav"];

function useActive(locale: Locale) {
  const pathname = usePathname();
  return (key: string) => pathname === `/${locale}/${key}` || pathname.startsWith(`/${locale}/${key}/`);
}

/** Desktop: tabs inside the navy header. */
export function HeaderNav({ locale, labels, role = "student" }: { locale: Locale; labels: NavLabels; role?: Role }) {
  const isActive = useActive(locale);
  const items = role === "advisor" ? advisorItems : studentDesktopItems;
  return (
    <nav aria-label={labels.mainNav} className="hidden self-stretch lg:flex">
      <ul className="flex items-stretch gap-1">
        {items.map(({ key }) => {
          const active = isActive(key);
          return (
            <li key={key} className="flex">
              <Link
                href={`/${locale}/${key}`}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative flex items-center px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "text-white" : "text-white/70 hover:text-white",
                )}
              >
                {labels[key]}
                {active && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-sm bg-brand" aria-hidden />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Phones and tablets: bottom tab bar within thumb reach. */
export function MobileTabBar({ locale, labels, role = "student" }: { locale: Locale; labels: NavLabels; role?: Role }) {
  const isActive = useActive(locale);
  const items = itemsFor(role);
  return (
    <nav
      aria-label={labels.mainNav}
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className={clsx("grid", items.length === 5 ? "grid-cols-5" : "grid-cols-2")}>
        {items.map(({ key, icon: Icon }) => {
          const active = isActive(key);
          return (
            <li key={key} className="min-w-0">
              <Link
                href={`/${locale}/${key}`}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative flex min-h-14 flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition-colors",
                  active ? "text-brand" : "text-muted",
                )}
              >
                {active && <span className="absolute inset-x-6 top-0 h-[3px] rounded-b-sm bg-brand" aria-hidden />}
                <Icon className="size-5" aria-hidden />
                <span className="max-w-full truncate px-1">{key === "grades" ? labels.gradesShort : labels[key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
