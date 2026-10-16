import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function parseDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(iso);
}

export function formatDate(iso?: string | null, lang = "es"): string {
  if (!iso) return "—";
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(lang, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso?: string | null, lang = "es"): string {
  if (!iso) return "—";
  const d = parseDate(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString(lang, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })} · ${d.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}`;
}

export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}