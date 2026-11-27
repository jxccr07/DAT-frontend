import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale, type Dictionary, type Locale } from "./types";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  ar: () => import("./ar").then((m) => m.default),
  en: () => import("./en").then((m) => m.default),
};

/** Current locale from the [lang] root segment (Server Components only). */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  if (!value || !hasLocale(value)) notFound();
  return value;
}

export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  return dictionaries[locale ?? (await getLocale())]();
}

export * from "./types";
