import { redirect } from "next/navigation";
import { getLocale } from "@/i18n";

/** /ar or /en → dashboard (proxy already sends signed-out users to login). */
export default async function LocaleRoot() {
  redirect(`/${await getLocale()}/dashboard`);
}
