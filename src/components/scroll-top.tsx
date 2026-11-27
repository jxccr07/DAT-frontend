"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Every page change starts at the top, so the page title isn't hidden under the
 * sticky header (and the welcome message is seen right after signing in).
 */
export function ScrollTop() {
  return (
    <Suspense fallback={null}>
      <ScrollOnPathChange />
    </Suspense>
  );
}

function ScrollOnPathChange() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
