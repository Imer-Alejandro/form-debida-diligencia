"use client";

import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

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
            Sánchez Business & Corp.
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
  const { t } = useI18n();
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500">*</span>}
        {!required && (
          <span className="text-[11px] font-normal text-slate-400">
            {t("common.optional")}
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

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-4xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const getFocusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => element.tabIndex >= 0);

    const initialFocus =
      dialog?.querySelector<HTMLElement>("[autofocus]") ??
      getFocusable()[0] ??
      dialog;
    initialFocus?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (e.key !== "Tab" || !dialog) return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          !dialog.contains(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          !dialog.contains(document.activeElement))
      ) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-navy-900/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl",
          maxWidth
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 sm:px-6">
          <h2 id={titleId} className="font-display text-[16px] font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">{children}</div>
      </div>
    </div>
  );
}