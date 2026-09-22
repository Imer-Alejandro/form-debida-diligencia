"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui";
import {
  statusTone,
  riskTone,
  statusLabelKey,
  riskLabelKey,
  STATUS_COLORS,
  RISK_COLORS,
} from "./tones";
import type { RegistrationStatus, RiskLevel } from "@/lib/types";

export interface StatPoint {
  key: string;
  value: number;
}

export interface DashboardProps {
  stats: StatPoint[];
  byStatus: { key: RegistrationStatus; value: number }[];
  byRisk: { key: RiskLevel; value: number }[];
  byCountry: [string, number][];
  monthly: { label: string; count: number }[];
  recent: {
    id: string;
    name: string;
    reference: string;
    submitted: string;
    status: RegistrationStatus;
    risk: RiskLevel;
  }[];
  allLink: ReactNode;
  emptyLink: ReactNode;
}

const STAT_LABELS: Record<string, string> = {
  "stats.total": "admin.dashboard.total",
  "stats.pending": "admin.dashboard.pending",
  "stats.drafts": "admin.dashboard.drafts",
  "stats.thisMonth": "admin.dashboard.newThisMonth",
};

const KPI_META: Record<
  string,
  { icon: ReactNode; chip: string; text: string }
> = {
  "stats.total": {
    chip: "#0f2842",
    text: "#0f2842",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M12 2 2 7l10 5 10-5-10-5z" />
        <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  "stats.pending": {
    chip: "#d97706",
    text: "#d97706",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  "stats.drafts": {
    chip: "#64748b",
    text: "#64748b",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  "stats.thisMonth": {
    chip: "#10b981",
    text: "#10b981",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <polyline points="3 17 9 11 13 15 21 7" />
        <polyline points="15 7 21 7 21 13" />
      </svg>
    ),
  },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : (name[0] ?? "?");
  return chars.toUpperCase();
}

export function Dashboard({
  stats,
  byStatus,
  byRisk,
  byCountry,
  monthly,
  recent,
  allLink,
  emptyLink,
}: DashboardProps) {
  const { t } = useI18n();
  const total = stats.find((s) => s.key === "stats.total")?.value ?? 0;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
          {t("admin.dashboard.title")}
        </h1>
        <p className="text-sm text-ink-muted">{t("admin.dashboard.subtitle")}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const meta = KPI_META[s.key];
          return (
            <div
              key={s.key}
              className="rounded-2xl border border-navy-800/10 bg-white p-4 shadow-[0_1px_2px_rgba(10,28,49,0.04)] transition-shadow hover:shadow-md hover:shadow-navy-900/5 sm:p-5"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `${meta.chip}1a`, color: meta.text }}
                >
                  {meta.icon}
                </span>
                <p className="min-w-0 text-[12px] font-medium leading-snug text-ink-muted">
                  {t(STAT_LABELS[s.key] as never)}
                </p>
              </div>
              <p className="mt-3 font-display text-[28px] font-bold leading-none tabular-nums text-navy-950 sm:text-[32px]">
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Status + monthly */}
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <div className="rounded-2xl border border-navy-800/10 bg-white p-5 shadow-[0_1px_2px_rgba(10,28,49,0.04)] lg:col-span-2">
          <Donut
            title={t("admin.dashboard.byStatus")}
            centerLabel={t("admin.dashboard.centerLabel")}
            colors={byStatus.map((d) => STATUS_COLORS[d.key])}
            data={byStatus.map((d) => ({ label: t(statusLabelKey(d.key) as never), value: d.value }))}
          />
        </div>
        <div className="rounded-2xl border border-navy-800/10 bg-white p-5 shadow-[0_1px_2px_rgba(10,28,49,0.04)] lg:col-span-3">
          <h3 className="mb-5 font-display text-[15px] font-semibold text-navy-900">
            {t("admin.dashboard.avgMonth")}
          </h3>
          <MonthBars data={monthly} />
        </div>
      </div>

      {/* Risk + countries */}
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <div className="rounded-2xl border border-navy-800/10 bg-white p-5 shadow-[0_1px_2px_rgba(10,28,49,0.04)] lg:col-span-2">
          <Donut
            title={t("admin.dashboard.byRisk")}
            centerLabel={t("admin.dashboard.centerLabel")}
            colors={byRisk.map((d) => RISK_COLORS[d.key])}
            data={byRisk.map((d) => ({ label: t(riskLabelKey(d.key) as never), value: d.value }))}
          />
        </div>
        <div className="rounded-2xl border border-navy-800/10 bg-white p-5 shadow-[0_1px_2px_rgba(10,28,49,0.04)] lg:col-span-3">
          <h3 className="mb-5 font-display text-[15px] font-semibold text-navy-900">
            {t("admin.dashboard.suppliersByCountry")}
          </h3>
          <div className="space-y-4">
            {byCountry.map(([k, v]) => {
              const pct = total ? Math.round((v / total) * 100) : 0;
              return (
                <div key={k} className="group flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="truncate pr-3 font-medium text-ink-soft">{k}</span>
                    <span className="tabular-nums text-ink">
                      {v}{" "}
                      <span className="text-[12px] text-ink-muted">· {pct}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-bone-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-navy-600 to-navy-900 transition-[width] duration-500 group-hover:brightness-110"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {byCountry.length === 0 && <p className="text-sm text-ink-muted">—</p>}
          </div>
        </div>
      </div>

      {/* Recent */}
      <div className="mt-5 rounded-2xl border border-navy-800/10 bg-white shadow-[0_1px_2px_rgba(10,28,49,0.04)]">
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="font-display text-[15px] font-semibold text-navy-900">
            {t("admin.dashboard.recent")}
          </h3>
          {allLink && (
            <span className="text-[13px] font-medium text-navy-700 hover:text-navy-900">
              {allLink}
            </span>
          )}
        </div>
        <div className="mt-3 divide-y divide-navy-800/5">
          {recent.map((r) => (
            <Link
              key={r.id}
              href={`/admin/suppliers/${r.id}`}
              className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-bone-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-[12px] font-bold text-navy-700">
                {initials(r.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink group-hover:text-navy-800">
                  {r.name}
                </p>
                <p className="text-[12px] text-ink-muted">
                  {r.reference} · {formatDate(r.submitted)}
                </p>
              </div>
              <Badge tone={riskTone(r.risk)}>{t(riskLabelKey(r.risk) as never)}</Badge>
              <Badge tone={statusTone(r.status)}>
                {t(statusLabelKey(r.status) as never)}
              </Badge>
            </Link>
          ))}
          {recent.length === 0 && (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-ink">Aún no hay registros</p>
              <p className="mt-1 text-[13px] text-ink-muted">
                Crea una invitación desde {emptyLink} para empezar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Donut({
  title,
  data,
  size = 150,
  centerLabel,
  colors,
}: {
  title: string;
  data: { label: string; value: number }[];
  size?: number;
  centerLabel?: string;
  colors?: string[];
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const FALLBACK = [
    "#0f2842",
    "#b9995c",
    "#10b981",
    "#d97706",
    "#ef4444",
    "#3b82f6",
    "#8b5cf6",
  ];
  const [active, setActive] = useState<number | null>(null);
  const R = 78;
  const C = 2 * Math.PI * R;

  const segments = data.reduce<
    {
      label: string;
      value: number;
      color: string;
      start: number;
      span: number;
      pct: number;
    }[]
  >((acc, d, i) => {
    const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].span : 0;
    const span = total ? (d.value / total) * C : 0;
    acc.push({
      label: d.label,
      value: d.value,
      color: (colors ?? FALLBACK)[i % FALLBACK.length],
      start,
      span,
      pct: total ? Math.round((d.value / total) * 100) : 0,
    });
    return acc;
  }, []);

  return (
    <div>
      <h3 className="mb-4 font-display text-[15px] font-semibold text-navy-900">{title}</h3>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg viewBox="0 0 200 200" width={size} height={size}>
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth="26"
              className="text-bone-100"
              opacity="0.8"
            />
            {segments.map((s, i) =>
              s.value > 0 ? (
                <circle
                  key={i}
                  cx="100"
                  cy="100"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="26"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(0, s.span - 1.5)} ${C}`}
                  transform={`rotate(${s.start / C * 360 - 90} 100 100)`}
                  className="cursor-pointer transition-opacity duration-200"
                  opacity={active === null || active === i ? 1 : 0.2}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                />
              ) : null
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[30px] font-bold leading-none tabular-nums text-navy-950">
              {total}
            </span>
            {centerLabel && (
              <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                {centerLabel}
              </span>
            )}
          </div>
        </div>
        <ul className="w-full min-w-0 space-y-1.5">
          {segments.map((s, i) => (
            <li
              key={i}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1 transition-colors"
              style={{ background: active === i ? "#f1f5f9" : "transparent" }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <span className="flex-1 truncate text-[12.5px] text-ink-soft">{s.label}</span>
              <span className="tabular-nums text-[12px] text-ink-muted">{s.pct}%</span>
              <span className="w-6 text-right tabular-nums text-[13px] font-semibold text-ink">
                {s.value}
              </span>
            </li>
          ))}
          {total === 0 && <li className="text-sm text-ink-muted">—</li>}
        </ul>
      </div>
    </div>
  );
}

function MonthBars({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-48 items-end gap-2.5 sm:gap-3">
      {data.map((d) => {
        const isMax = d.count === max && d.count > 0;
        const fillH = d.count > 0 ? Math.max(6, Math.round((d.count / max) * 100)) : 0;
        return (
          <div key={d.label} className="group flex flex-1 flex-col items-center gap-2">
            <span className="text-[12px] font-semibold tabular-nums text-ink-soft">
              {d.count}
            </span>
            <div className="flex h-36 w-full items-end rounded-xl bg-navy-800/[0.06]">
              <div
                className="w-full rounded-xl transition-all duration-500 group-hover:brightness-110"
                style={{
                  height: `${fillH}%`,
                  background: isMax
                    ? "linear-gradient(180deg,#d8b985,#b9995c)"
                    : "linear-gradient(180deg,#1e4d76,#0a1c31)",
                  boxShadow: d.count > 0 ? "0 2px 8px rgba(10,28,49,0.18)" : "none",
                }}
              />
            </div>
            <span className="text-[11.5px] font-medium text-ink-muted">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}