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
          "relative grid h-9 w-9 place-items-center rounded-xl font-display text-sm font-bold shadow-xs transition-transform hover:scale-105",
          dark
            ? "bg-navy-900 text-white ring-1 ring-white/10"
            : "bg-navy-900 text-white shadow-navy-900/20"
        )}
      >
        <span className="text-[15px] font-bold tracking-tight text-white">S</span>
        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-teal-600" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p
            className={cn(
              "font-display text-[14.5px] font-bold tracking-tight",
              dark ? "text-slate-900" : "text-white"
            )}
          >
            Sanchez Business Corp
          </p>
          <p
            className={cn(
              "text-[10.5px] font-semibold uppercase tracking-[0.16em]",
              dark ? "text-slate-400" : "text-slate-300/80"
            )}
          >
            Debida Diligencia
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
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]",
        size === "sm" && "h-9 px-3.5 text-[13px]",
        size === "md" && "h-11 px-5 text-sm",
        size === "lg" && "h-12 px-7 text-[15px]",
        variant === "primary" &&
          "bg-navy-900 text-white shadow-xs shadow-navy-950/20 hover:bg-navy-800 hover:shadow-sm active:bg-navy-950",
        variant === "secondary" &&
          "border border-slate-200 bg-white text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
        variant === "ghost" &&
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        variant === "danger" &&
          "border border-rose-200/80 bg-rose-50/60 text-rose-600 hover:bg-rose-100/70 hover:border-rose-300",
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
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500">*</span>}
        {!required && (
          <span className="text-[11px] font-normal text-slate-400">
            Opcional
          </span>
        )}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && (
        <span className="mt-1 block text-xs text-rose-500 font-medium">{error}</span>
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
        "h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-800 transition-colors placeholder:text-slate-400/80 shadow-2xs",
        invalid
          ? "border-rose-300 ring-2 ring-rose-500/10 focus:border-rose-500"
          : "border-slate-200/90 hover:border-slate-300 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15",
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
        "h-11 w-full appearance-none rounded-xl border border-slate-200/90 bg-white px-3.5 text-sm text-slate-800 transition-colors hover:border-slate-300 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15 shadow-2xs",
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
        "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 text-sm text-slate-800 transition-colors placeholder:text-slate-400/80 hover:border-slate-300 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15 shadow-2xs",
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
        "flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 text-sm text-slate-800 transition-colors hover:border-slate-300 shadow-2xs",
        checked && "border-navy-700/40 bg-navy-50/50",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 accent-navy-900 rounded"
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
        "rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03),0_6px_16px_rgba(15,23,42,0.02)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export type BadgeTone =
  | "navy"
  | "gold"
  | "green"
  | "amber"
  | "red"
  | "gray"
  | "bone"
  | "blue"
  | "teal";

export function Badge({
  children,
  tone = "bone",
  withDot = true,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  withDot?: boolean;
  className?: string;
}) {
  const tones: Record<BadgeTone, { pill: string; dot: string }> = {
    navy: { pill: "bg-navy-900 text-white border-transparent", dot: "bg-teal-400" },
    gold: { pill: "bg-amber-50/90 text-amber-800 border-amber-200/70", dot: "bg-amber-500" },
    green: { pill: "bg-emerald-50 text-emerald-700 border-emerald-200/70", dot: "bg-emerald-500" },
    amber: { pill: "bg-amber-50 text-amber-700 border-amber-200/70", dot: "bg-amber-500" },
    red: { pill: "bg-rose-50 text-rose-700 border-rose-200/70", dot: "bg-rose-500" },
    blue: { pill: "bg-sky-50 text-sky-700 border-sky-200/70", dot: "bg-sky-500" },
    teal: { pill: "bg-teal-50 text-teal-700 border-teal-200/70", dot: "bg-teal-600" },
    gray: { pill: "bg-slate-100 text-slate-600 border-slate-200/70", dot: "bg-slate-400" },
    bone: { pill: "bg-slate-50 text-slate-600 border-slate-200/80", dot: "bg-slate-400" },
  };

  const current = tones[tone] ?? tones.bone;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium leading-normal",
        current.pill,
        className
      )}
    >
      {withDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", current.dot)} />
      )}
      <span>{children}</span>
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
      className="relative inline-flex h-9 w-20 cursor-pointer items-center rounded-full bg-slate-900 transition-colors select-none p-1"
    >
      <span
        className={cn(
          "flex h-7 w-9 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-200 shadow-xs",
          checked
            ? "translate-x-9 bg-white text-slate-900"
            : "translate-x-0 bg-white text-slate-900"
        )}
      >
        {checked ? labels[1] : labels[0]}
      </span>
    </div>
  );
}