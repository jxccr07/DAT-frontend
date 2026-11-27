"use client";

import { useActionState, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Wand2 } from "lucide-react";
import { demoAdvisorAction, demoStudentAction, loginAction } from "@/lib/actions";
import { PasswordField } from "@/components/ui/password-field";
import { FormAlert } from "@/components/ui/form-alert";
import type { Dictionary, Locale } from "@/i18n/types";

type Props = {
  locale: Locale;
  dict: Pick<Dictionary, "auth" | "errors">;
  /** Students and advisors each sign in on their own page. */
  portal?: "student" | "advisor";
};

export function LoginForm({ locale, dict, portal = "student" }: Props) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const [email, setEmail] = useState(state?.email ?? "");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoPending, startDemo] = useTransition();
  const expired = useSearchParams().get("expired") === "1";

  const errorText = (code: string) => (dict.errors as Record<string, string>)[code] ?? dict.errors.unknown;
  // After filling demo details, the previous attempt's error no longer applies (until the next submit).
  const [dismissedFor, setDismissedFor] = useState<unknown>(null);
  const serverError = state?.error && dismissedFor !== state ? errorText(state.error) : null;
  const error = demoError ?? serverError;

  // Advisors get one demo button; students choose a persona.
  const staff = portal === "advisor";
  const demo = {
    advisor: { title: dict.auth.demoAdvisorTitle, body: dict.auth.demoAdvisorBody, button: dict.auth.demoAdvisor, filled: dict.auth.demoAdvisorFilled },
    student: { title: dict.auth.demoStudentTitle, body: dict.auth.demoStudentBody, button: "", filled: dict.auth.demoStudentFilled },
  }[portal];
  const fillDemo = (persona: "struggling" | "on_track" = "struggling") =>
    startDemo(async () => {
      setDemoError(null);
      setDismissedFor(state);
      const result =
        portal === "advisor" ? await demoAdvisorAction(locale) : await demoStudentAction(locale, persona);
      if (result.ok && result.data) {
        setEmail(result.data.email);
        setPassword(result.data.password);
        setNotice(demo.filled);
      } else {
        setDemoError(errorText(result.ok ? "unknown" : result.code));
      }
    });

  // Validation messages in the page's language, not the browser's.
  const onInvalid = (e: React.InvalidEvent<HTMLInputElement>) =>
    e.currentTarget.setCustomValidity(e.currentTarget.validity.valueMissing ? dict.errors.required : dict.errors.invalidEmail);
  const clearValidity = (e: React.FormEvent<HTMLInputElement>) => e.currentTarget.setCustomValidity("");

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="lang" value={locale} />
      <input type="hidden" name="portal" value={portal} />

      <div className="rounded-md border border-dashed border-brand/40 bg-brand-soft/50 p-4">
        <p className="text-sm font-semibold">{demo.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{demo.body}</p>
        {staff ? (
          <button type="button" onClick={() => fillDemo()} disabled={demoPending} className="btn-outline mt-3 h-9 w-full text-brand">
            {demoPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Wand2 className="size-4" aria-hidden />}
            {demoPending ? dict.auth.demoLoading : demo.button}
          </button>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => fillDemo("struggling")} disabled={demoPending} className="btn-outline h-9 text-xs text-brand">
              {demoPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Wand2 className="size-4" aria-hidden />}
              {dict.auth.demoStruggling}
            </button>
            <button type="button" onClick={() => fillDemo("on_track")} disabled={demoPending} className="btn-outline h-9 text-xs text-brand">
              <Wand2 className="size-4" aria-hidden />
              {dict.auth.demoOnTrack}
            </button>
          </div>
        )}
      </div>

      {error && <FormAlert tone="bad">{error}</FormAlert>}
      {notice && !error && <FormAlert tone="ok">{notice}</FormAlert>}
      {expired && !error && <FormAlert tone="warn">{dict.auth.sessionExpired}</FormAlert>}

      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium">
          {dict.auth.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          dir="ltr"
          required
          maxLength={255}
          className="input"
          placeholder={portal === "advisor" ? "advisor1.1@example.com" : "300000123@example.com"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onInvalid={onInvalid}
          onInput={clearValidity}
          aria-invalid={(serverError !== null && state?.error === "invalid_credentials") || undefined}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium">
          {dict.auth.password}
        </label>
        <PasswordField
          id="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={255}
          showLabel={dict.auth.showPassword}
          hideLabel={dict.auth.hidePassword}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onInvalid={onInvalid}
          onInput={clearValidity}
          aria-invalid={(serverError !== null && state?.error === "invalid_credentials") || undefined}
        />
      </div>

      <button type="submit" className="btn-navy h-11 w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? dict.auth.submitting : dict.auth.submit}
      </button>
    </form>
  );
}
