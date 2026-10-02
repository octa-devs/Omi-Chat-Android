"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, CircleAlert, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── shell ────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  error,
  success,
  children,
  className,
  trailing,
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  success?: boolean;
  children: ReactNode;
  className?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-3">
          <label className="text-[0.7rem] font-semibold tracking-[0.16em] text-fg-2 uppercase">
            {label}
          </label>
          {hint && <span className="text-xs text-fg-3">{hint}</span>}
        </div>
      )}
      <div className="relative">
        {children}
        {trailing && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">{trailing}</div>
        )}
      </div>
      <FieldMessage error={error} success={success && !error} />
    </div>
  );
}

export function FieldMessage({
  error,
  success,
}: {
  error?: string | null;
  success?: boolean;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {error ? (
        <motion.p
          key="err"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1.5 text-xs text-rust-600"
        >
          <CircleAlert className="size-3.5 shrink-0" />
          {error}
        </motion.p>
      ) : success ? (
        <motion.p
          key="ok"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1.5 text-xs text-mint-600"
        >
          <Check className="size-3.5 shrink-0" />
          Looks good
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

/* ── input ────────────────────────────────────────────────── */

const inputBase =
  "peer w-full rounded-2xl border border-fg/12 bg-white px-4 text-[0.95rem] text-fg shadow-[0_1px_2px_rgba(19,23,37,0.04)] outline-none transition-all duration-300 placeholder:text-fg-3 hover:border-fg/20 focus:border-brand-500 focus:bg-white focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-brand-500)_14%,transparent),0_1px_2px_rgba(19,23,37,0.04)] disabled:opacity-50";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  invalid?: boolean;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, icon, invalid, wrapperClassName, type = "text", ...props },
  ref,
) {
  const [reveal, setReveal] = useState(false);
  const id = useId();
  const isPassword = type === "password";
  const inputType = isPassword && reveal ? "text" : type;

  return (
    <div className={cn("relative", wrapperClassName)}>
      {icon && (
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-3 transition-colors peer-focus:text-brand-600">
          {icon}
        </span>
      )}
      <input
        id={id}
        ref={ref}
        type={inputType}
        aria-invalid={invalid || undefined}
        className={cn(
          inputBase,
          "h-12",
          icon && "pl-11",
          isPassword && "pr-12",
          invalid && "border-rust-500 focus:border-rust-600 focus:shadow-[0_0_0_4px_rgba(224,51,79,0.12)]",
          className,
        )}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-fg-3 transition-colors hover:bg-fg/8 hover:text-fg"
        >
          {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      )}
    </div>
  );
});

/* ── textarea ─────────────────────────────────────────────── */

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        inputBase,
        "resize-none py-3.5 leading-relaxed",
        invalid && "border-rust-400/70",
        className,
      )}
      {...props}
    />
  );
});

/* ── switch ───────────────────────────────────────────────── */

export function Switch({
  checked,
  onChange,
  label,
  description,
  icon,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span
            className={cn(
              "mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl transition-colors duration-300",
              checked
                ? "bg-brand-50 text-brand-700"
                : "bg-fg/5 text-fg-3",
            )}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">{label}</p>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-fg-3">
              {description}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-40",
          checked
            ? "bg-[linear-gradient(100deg,var(--color-brand-500),var(--color-brand-700))] shadow-[0_0_18px_-3px_var(--color-brand-500)]"
            : "bg-ink-700 hover:bg-ink-600",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 620, damping: 34 }}
          className="absolute top-0.5 size-5 rounded-full bg-white shadow-md"
          style={{ left: checked ? 22 : 2 }}
        />
      </button>
    </div>
  );
}

/* ── segmented control ────────────────────────────────────── */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: ReactNode; title?: string }>;
  className?: string;
}) {
  const groupId = useId();
  return (
    <div
      className={cn(
        "glass-subtle relative inline-flex flex-wrap gap-1 rounded-2xl p-1",
        className,
      )}
      role="radiogroup"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors duration-300",
              active ? "text-fg" : "text-fg-3 hover:text-fg-2",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${groupId}`}
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
                className="absolute inset-0 -z-10 rounded-xl bg-white shadow-[0_1px_3px_rgba(19,23,37,0.1)] ring-1 ring-fg/10"
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── select ───────────────────────────────────────────────── */

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          inputBase,
          "h-12 cursor-pointer appearance-none pr-10 [&>option]:bg-white [&>option]:text-fg",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-fg-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
});