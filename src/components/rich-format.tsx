import { Fragment, type ReactNode } from "react";

/**
 * Like `format`, but values can be React nodes. Grade letters and signed numbers
 * go through <bdi> so "C+" and "+2.6" keep their order inside Arabic sentences.
 */
export function richFormat(template: string, values: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/g).map((part, i) => {
    const key = part.match(/^\{(\w+)\}$/)?.[1];
    return <Fragment key={i}>{key && key in values ? values[key] : part}</Fragment>;
  });
}

/** Isolate a left-to-right token (grade letter, signed number, code) inside RTL text. */
export function Ltr({ children }: { children: ReactNode }) {
  return <bdi dir="ltr">{children}</bdi>;
}
