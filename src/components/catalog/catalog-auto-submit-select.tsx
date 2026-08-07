"use client";

import type { ReactNode } from "react";

/**
 * A plain `<select>` has no way to submit its enclosing form on change without JS — the control
 * bar's sort field sits alone with no nearby submit button (unlike the filter dialog's fields,
 * which share one "Применить" button), so picking an option previously did nothing until some
 * other field happened to submit the form. This is the minimal client-side addition needed to
 * make it actually work: request the form submit on change, nothing else.
 */
export function CatalogAutoSubmitSelect({
  id,
  name,
  defaultValue,
  className,
  ariaLabel,
  children,
}: Readonly<{
  id: string;
  name: string;
  defaultValue: string;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}>) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className={className}
      aria-label={ariaLabel}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      {children}
    </select>
  );
}
