"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  "group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-full font-medium whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:pointer-events-none disabled:opacity-45 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:
          "text-on-accent shadow-[0_10px_40px_-14px_rgba(42,103,204,0.45)] bg-[linear-gradient(105deg,var(--color-brand-500),var(--color-brand-700)_55%,var(--color-brand-800))] hover:shadow-[0_18px_55px_-14px_rgba(42,103,204,0.55)] hover:-translate-y-0.5",
        gold:
          "text-[#2a1c05] font-semibold bg-[linear-gradient(105deg,var(--color-gold-200),var(--color-gold-400))] shadow-[0_10px_34px_-14px_rgba(192,124,31,0.4)] hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-14px_rgba(192,124,31,0.5)]",
        glass:
          "glass text-fg hover:bg-brand-50 hover:border-brand-400/70 hover:-translate-y-0.5",
        outline:
          "border border-fg/12 bg-transparent text-fg hover:border-brand-500 hover:text-brand-700 hover:bg-brand-50",
        ghost:
          "text-fg-2 hover:bg-fg/6 hover:text-fg",
        danger:
          "bg-[linear-gradient(105deg,var(--color-rust-400),var(--color-rust-500))] text-on-accent shadow-[0_10px_32px_-14px_rgba(224,51,79,0.4)] hover:-translate-y-0.5",
        muted:
          "bg-fg/5 text-fg-3 hover:bg-fg/9 hover:text-fg",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-7 text-[0.95rem]",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

/** Sheen that sweeps across the surface on hover. */
function Sheen() {
  return (
    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent,rgb(255_255_255/0.42),transparent)] transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-full" />
  );
}

const LABEL = "relative z-10 flex items-center justify-center gap-2";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    >
      {(variant === "primary" || variant === "gold" || variant === "danger") && (
        <Sheen />
      )}
      {loading ? (
        <span className={cn(LABEL, "opacity-90")}>
          <Spinner className="size-4" />
          {children}
        </span>
      ) : (
        <span className={LABEL}>{children}</span>
      )}
    </button>
  );
});

/** Same visual language as <Button>, but renders a real <a>/<Link>. */
export function ButtonLink({
  href,
  external,
  className,
  variant,
  size,
  block,
  children,
  prefetch,
  ...rest
}: {
  href: string;
  external?: boolean;
  className?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  block?: boolean;
  children: React.ReactNode;
  prefetch?: boolean;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  const cls = cn(buttonVariants({ variant, size, block }), className);
  const inner = (
    <>
      {(variant === "primary" || variant === "gold" || variant === "danger") && (
        <Sheen />
      )}
      <span className={LABEL}>{children}</span>
    </>
  );

  if (external || href.startsWith("http") || href.startsWith("mailto:")) {
    return (
      <a
        href={href}
        className={cls}
        {...(href.startsWith("mailto:")
          ? {}
          : { target: "_blank", rel: "noopener noreferrer" })}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={cls} prefetch={prefetch} {...rest}>
      {inner}
    </Link>
  );
}

export { buttonVariants };