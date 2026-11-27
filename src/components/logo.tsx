import Image from "next/image";
import clsx from "clsx";
import mark from "../../public/brand/dat-mark.png";
import markDark from "../../public/brand/dat-mark-dark.png";
import full from "../../public/brand/dat-full.png";
import fullDark from "../../public/brand/dat-full-dark.png";

type Props = {
  /** "mark" = DAT letters only, "full" = with Digital Academic Twin wordmark */
  variant?: "mark" | "full";
  /** Force the light-ink version (for the navy header) regardless of theme. */
  onDark?: boolean;
  className?: string;
  alt: string;
  priority?: boolean;
};

/** The official DAT logo. Swaps to a light-ink version in dark mode so it stays visible. */
export function Logo({ variant = "mark", onDark, className, alt, priority }: Props) {
  const light = variant === "mark" ? mark : full;
  const dark = variant === "mark" ? markDark : fullDark;

  if (onDark) {
    return <Image src={dark} alt={alt} className={className} priority={priority} />;
  }

  return (
    <>
      <Image src={light} alt={alt} className={clsx("dark:hidden", className)} priority={priority} />
      <Image src={dark} alt={alt} className={clsx("hidden dark:block", className)} priority={priority} />
    </>
  );
}
