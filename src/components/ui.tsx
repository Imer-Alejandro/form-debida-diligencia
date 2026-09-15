"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Logo({
  dark = false,
  compact = false,
}: {
  dark?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg font-display text-lg font-semibold",
          dark ? "bg-bone-100 text-navy-900" : "bg-navy-800 text-gold-400"
        )}
      >
        S
      </div>
      {!compact && (
        <div className="leading-none">
          <p
            className={cn(
              "font-display text-[15px] font-semibold tracking-tight",
              dark ? "text-navy-900" : "text-white"
            )}
          >
            Sanchez Business Corp
          </p>
          <p
            className={cn(
              "mt-1 text-[11px] uppercase tracking-[0.22em]",
              dark ? "text-ink-muted" : "text-bone-200/70"
            )}
          >
            Proveedores
          </p>
        </div>
      )}
    </div>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-9 px-3.5 text-[13px]",
        size === "md" && "h-11 px-5 text-sm",
        size === "lg" && "h-12 px-7 text-[15px]",
        variant === "primary" &&
          "bg-navy-800 text-white shadow-sm hover:bg-navy-700 active:bg-navy-900",
        variant === "secondary" &&
          "border border-navy-800/20 bg-white text-navy-800 hover:border-navy-800/40 hover:bg-bone-100",
        variant === "ghost" &&
          "text-navy-800 hover:bg-navy-800/5",
        variant === "danger" &&
          "border border-danger/30 bg-white text-danger hover:bg-danger/5",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink">
        {label}
        {required && <span className="text-danger">*</span>}
        {!required && (
          <span className="text-[11px] font-normal text-ink-muted">
            Opcional
          </span>
        )}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
      {error && (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      )}
    </label>
  );
}

export function Input({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-ink transition-colors placeholder:text-ink-muted/60",
        invalid ? "border-danger/60" : "border-navy-800/15 hover:border-navy-800/30",
        "focus:border-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-600/20",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full appearance-none rounded-xl border border-navy-800/15 bg-white px-3.5 text-sm text-ink transition-colors hover:border-navy-800/30 focus:border-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-600/20",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-navy-800/15 bg-white px-3.5 py-3 text-sm text-ink transition-colors placeholder:text-ink-muted/60 hover:border-navy-800/30 focus:border-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-600/20",
        className
      )}
      {...props}
    />
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-navy-800/15 bg-white px-3.5 py-3 text-sm text-ink transition-colors hover:border-navy-800/35",
        checked && "border-navy-700/50 bg-navy-50/40",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 accent-navy-800"
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-navy-800/10 bg-white shadow-[0_1px_2px_rgba(10,28,49,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}

type BadgeTone =
  | "navy"
  | "gold"
  | "green"
  | "amber"
  | "red"
  | "gray"
  | "bone";

export function Badge({
  children,
  tone = "bone",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const tones: Record<BadgeTone, string> = {
    navy: "bg-navy-800 text-white",
    gold: "bg-gold-400/25 text-[#6b5520]",
    green: "bg-success/15 text-success",
    amber: "bg-warning/15 text-warning",
    red: "bg-danger/15 text-danger",
    gray: "bg-ink/5 text-ink-soft",
    bone: "bg-bone-200 text-ink-soft",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-medium leading-none",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  labels,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  labels: [string, string];
}) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className="relative inline-flex h-9 w-20 cursor-pointer items-center rounded-full bg-navy-800/90 transition-colors select-none"
    >
      <span
        className={cn(
          "absolute left-1 flex h-7 w-9 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-200",
          checked
            ? "translate-x-0 bg-white text-navy-800"
            : "translate-x-0 bg-white text-navy-800"
        )}
        style={{ transform: checked ? "translateX(40px)" : "translateX(0px)" }}
      >
        {checked ? labels[1] : labels[0]}
      </span>
    </div>
  );
}