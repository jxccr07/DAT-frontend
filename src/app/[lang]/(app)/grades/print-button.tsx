"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="btn-outline no-print" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      {label}
    </button>
  );
}
