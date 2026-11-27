"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Opening "My messages" marks them read on the server, but the header (rendered in
 * the same pass) may still show the old unread count. Refresh once so the bell clears.
 */
export function RefreshOnce({ when }: { when: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (when) router.refresh();
  }, [when, router]);
  return null;
}
