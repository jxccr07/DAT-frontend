"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import clsx from "clsx";

const STORAGE_KEY = "dat-theme";

/**
 * Runs before first paint so the page never flashes the wrong theme.
 * First visit follows the OS setting; once the user clicks, their choice is remembered.
 */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}

/** The theme the user wants: their saved choice, else the OS setting. */
function wantsDark() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved === "dark";
  } catch {
    /* storage blocked */
  }
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Keeps the theme when the language changes. Switching /ar <-> /en re-renders
 * <html> (new lang/dir) and React rewrites its class list, dropping "dark".
 * The first-paint script doesn't run again on client navigation, so this
 * watcher puts the class back as soon as it disappears.
 */
export function ThemeSync() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = wantsDark();
      if (root.classList.contains("dark") !== dark) {
        root.classList.toggle("dark", dark);
        listeners.forEach((listener) => listener());
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return null;
}

const listeners = new Set<() => void>();
const isDark = () => document.documentElement.classList.contains("dark");

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function toggle() {
  const next = !isDark();
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  } catch {
    /* storage blocked: still applies for this page view */
  }
  listeners.forEach((listener) => listener());
}

type Labels = { label: string; toDark: string; toLight: string };

/** One button, two states — same interaction as the language button. */
export function ThemeToggle({ labels, className }: { labels: Labels; className?: string }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);
  const action = dark ? labels.toLight : labels.toDark;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={labels.label}
      title={action}
      onClick={toggle}
      className={clsx("grid size-9 place-items-center rounded-md transition-colors", className)}
    >
      {/* Shows the mode you will switch to */}
      <Moon className="size-[18px] dark:hidden" aria-hidden />
      <Sun className="hidden size-[18px] dark:block" aria-hidden />
    </button>
  );
}
