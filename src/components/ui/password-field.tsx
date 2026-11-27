"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  showLabel: string;
  hideLabel: string;
};

/** Password input with a visibility toggle (lets people verify what they typed, especially on mobile). */
export function PasswordField({ showLabel, hideLabel, className = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    // Passwords are always LTR; the wrapper is LTR too so the eye button and padding sit on the same side.
    <div className="relative" dir="ltr">
      <input {...props} type={visible ? "text" : "password"} className={`input pe-11 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 end-0 grid w-11 place-items-center text-muted hover:text-fg"
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        aria-controls={props.id}
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
