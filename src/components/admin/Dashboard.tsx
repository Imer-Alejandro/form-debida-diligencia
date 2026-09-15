"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui";
import { statusTone, riskTone, statusLabelKey, riskLabelKey } from "./tones";
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
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
          {t("admin.dashboard.title")}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t("admin.dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.key}
            className="rounded-2xl border border-navy-800/10 bg-white p-4 sm:p-5"
          >
            <p className="text-[11.5px] uppercase tracking-wide text-ink-muted">
              {t(STAT_LABELS[s.key] as never)}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <div className="rounded-2xl border border-navy-800/10 bg-white p-5 lg:col-span-2">
          <Donut
            title={t("admin.dashboard.byStatus")}
            data={byStatus.map((d) => ({ label: t(statusLabelKey(d.key) as never), value: d.value }))}
          />
        </div>
        <div className="rounded-2xl border border-navy-800/10 bg-white p-5 lg:col-span-3">
          <h3 className="mb-4 font-display text-[15px] font-semibold text-navy-900">
            {t("admin.dashboard.avgMonth")}
          </h3>
          <MonthBars data={monthly} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <div className="rounded-2xl border border-navy-800/10 bg-white p-5 lg:col-span-2">
          <Donut
            title={t("admin.dashboard.byRisk")}
            data={byRisk.map((d) => ({ label: t(riskLabelKey(d.key) as never), value: d.value }))}
          />
        </div>
        <div className="rounded-2xl border border-navy-800/10 bg-white p-5 lg:col-span-3">
          <h3 className="mb-4 font-display text-[15px] font-semibold text-navy-900">
            {t("admin.dashboard.suppliersByCountry")}
          </h3>
          <div className="space-y-2.5">
            {byCountry.map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-40 truncate text-[13px] text-ink-soft">{k}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-navy-800/10">
                  <div
                    className="h-full rounded-full bg-navy-800"
                    style={{ width: `${total ? (v / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[13px] tabular-nums text-ink-soft">
                  {v}
                </span>
              </div>
            ))}
            {byCountry.length === 0 && <p className="text-sm text-ink-muted">—</p>}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-navy-800/10 bg-white">
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="font-display text-[15px] font-semibold text-navy-900">
            {t("admin.dashboard.recent")}
          </h3>
          {allLink}
        </div>
        <div className="mt-3 divide-y divide-navy-800/5">
          {recent.map((r) => (
            <Link
              key={r.id}
              href={`/admin/suppliers/${r.id}`}
              className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-bone-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{r.name}</p>
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
            <p className="px-5 py-8 text-center text-sm text-ink-muted">
              No hay registros todavía; crea una invitación desde {emptyLink}
            </p>
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
}: {
  title: string;
  data: { label: string; value: number }[];
  size?: number;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const COLORS = [
    "#0f2842",
    "#b9995c",
    "#2f7d5b",
    "#b07b2e",
    "#b3403c",
    "#7a828e",
    "#1e4d76",
  ];
  const segments = data.reduce<
    {
      label: string;
      value: number;
      start: number;
      end: number;
      color: string;
    }[]
  >((acc, d, i) => {
    const prevEnd = acc.length ? acc[acc.length - 1].end : 0;
    const span = (d.value / Math.max(1, total)) * 360;
    acc.push({ ...d, start: prevEnd, end: prevEnd + span, color: COLORS[i % COLORS.length] });
    return acc;
  }, []);

  return (
    <div>
      <h3 className="mb-4 font-display text-[15px] font-semibold text-navy-900">{title}</h3>
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <svg viewBox="0 0 42 42" width={size} height={size}>
          <circle
            cx="21"
            cy="21"
            r="15.915"
            fill="none"
            stroke="#0f2842"
            strokeWidth="1.4"
            opacity="0.06"
          />
          {segments.map((s, i) => {
            const large = s.end - s.start > 180 ? 1 : 0;
            const x1 = 21 + 15.915 * Math.cos((Math.PI * s.start) / 180);
            const y1 = 21 + 15.915 * Math.sin((Math.PI * s.start) / 180);
            const x2 = 21 + 15.915 * Math.cos((Math.PI * s.end) / 180);
            const y2 = 21 + 15.915 * Math.sin((Math.PI * s.end) / 180);
            return (
              <path
                key={i}
                d={`M 21 21 L ${x1.toFixed(3)} ${y1.toFixed(3)} A 15.915 15.915 0 ${large} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`}
                fill={s.color}
                opacity="0.88"
              />
            );
          })}
          <circle cx="21" cy="21" r="11.5" fill="#fff" />
          <text
            x="21"
            y="24.4"
            textAnchor="middle"
            fontSize="6.4"
            fontWeight="700"
            fill="#0a1c31"
            fontFamily="inherit"
          >
            {total}
          </text>
        </svg>
        <ul className="w-full min-w-0 space-y-1.5">
          {segments.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-[12.5px]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: s.color }}
              />
              <span className="flex-1 truncate text-ink-soft">{s.label}</span>
              <span className="tabular-nums text-ink">{s.value}</span>
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
    <div className="flex h-44 items-end gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-[12px] tabular-nums text-ink-muted">{d.count}</span>
          <div className="flex h-28 w-full items-end rounded-lg bg-navy-800/5">
            <div
              className="w-full rounded-lg bg-navy-800 transition-all"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 6 : 0 }}
            />
          </div>
          <span className="text-[11.5px] text-ink-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}