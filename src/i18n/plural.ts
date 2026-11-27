import { format, type Dictionary } from "./types";

export type Units = Dictionary["common"]["units"];
export type Unit = Exclude<keyof Units, "locale">;

const numberFormats = new Map<string, Intl.NumberFormat>();

/** 1234.5 → "1,234.5" with Latin digits in both languages (matches the rest of the UI). */
export function formatNumber(n: number, locale: string, maxFractionDigits = 1) {
  const key = `${locale}:${maxFractionDigits}`;
  if (!numberFormats.has(key)) {
    numberFormats.set(key, new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-US", { maximumFractionDigits: maxFractionDigits }));
  }
  return numberFormats.get(key)!.format(n);
}

/**
 * Number + correctly inflected noun: Arabic has six plural forms
 * (ساعة واحدة، ساعتان، 3 ساعات، 11 ساعة…), English two.
 */
export function qty(units: Units, unit: Unit, n: number) {
  const forms = units[unit];
  const rounded = Math.round(n * 10) / 10;
  const category = Number.isInteger(rounded) ? new Intl.PluralRules(units.locale).select(rounded) : "other";
  const template = forms[category as keyof typeof forms] ?? forms.other;
  return format(template, { n: formatNumber(rounded, units.locale) });
}
