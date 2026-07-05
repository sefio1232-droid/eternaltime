import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-[var(--surface-strong)] bg-[var(--surface-strong)] text-[var(--text-inverse)] hover:bg-[var(--accent-strong)]",
  secondary:
    "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent-strong)]",
  ghost:
    "border-transparent bg-transparent text-[var(--text)] hover:bg-[var(--surface-muted)]",
};

function buttonClasses(variant: ButtonVariant): string {
  return [
    "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-45",
    variantClasses[variant],
  ].join(" ");
}

type ButtonNativeProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button(props: ButtonNativeProps) {
  const { className = "", variant = "primary", ...buttonProps } = props;

  return <button className={`${buttonClasses(variant)} ${className}`} {...buttonProps} />;
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <Link href={href} className={`${buttonClasses(variant)} ${className}`} {...props}>
      {children}
    </Link>
  );
}
