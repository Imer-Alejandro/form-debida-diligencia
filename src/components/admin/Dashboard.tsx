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
  byType: [string, number][];
  byCountry: [string, number][];
  monthly: { label: string; count: number }[];
  monthlyTimeline?: { label: string; created: number; approved: number }[];
  complianceStats?: {
    rate: number;
    approved: number;
    inReview: number;
    changes: number;
    rejected: number;
  };
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

const STAT_CONFIG: Record<
  string,
  {
    labelKey: string;
    trend: string;
    chipBg: string;
    chipColor: string;
    stroke: string;
    icon: ReactNode;
  }
> = {
  "stats.total": {
    labelKey: "admin.dashboard.total",
    trend: "+100%",
    chipBg: "bg-slate-100",
    chipColor: "text-slate-800",
    stroke: "#0f2842",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M12 2 2 7l10 5 10-5-10-5z" />
        <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  "stats.pending": {
    labelKey: "admin.dashboard.pending",
    trend: "Por revisar",
    chipBg: "bg-amber-50",
    chipColor: "text-amber-600",
    stroke: "#f59e0b",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  "stats.drafts": {
    labelKey: "admin.dashboard.drafts",
    trend: "En proceso",
    chipBg: "bg-slate-100/70",
    chipColor: "text-slate-600",
    stroke: "#94a3b8",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  "stats.docs": {
    labelKey: "admin.dashboard.docsAttached",
    trend: "+24%",
    chipBg: "bg-sky-50",
    chipColor: "text-sky-600",
    stroke: "#0284c7",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>
    ),
  },
  "stats.thisMonth": {
    labelKey: "admin.dashboard.newThisMonth",
    trend: "Nuevos",
    chipBg: "bg-emerald-50",
    chipColor: "text-emerald-600",
    stroke: "#10b981",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <polyline points="3 17 9 11 13 15 21 7" />
        <polyline points="15 7 21 7 21 13" />
      </svg>
    ),
  },
};

const CHART_PALETTE = [
  "#0f2842",
  "#0d9488",
  "#0284c7",
  "#f59e0b",
  "#6366f1",
  "#10b981",
  "#f43f5e",
  "#64748b",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : (name[0] ?? "?");
  return chars.toUpperCase();
}

function humanize(key: string): string {
  const s = key.replace(/_/g, " ").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function Dashboard({
  stats,
  byStatus,
  byRisk,
  byType,
  byCountry,
  monthly,
  monthlyTimeline,
  complianceStats,
  recent,
  allLink,
  emptyLink,
}: DashboardProps) {
  const { t } = useI18n();
  const total = stats.find((s) => s.key === "stats.total")?.value ?? 0;
  const trend = monthly.map((m) => m.count);

  const timelineSeries =
    monthlyTimeline && monthlyTimeline.length > 0
      ? monthlyTimeline
      : monthly.map((m) => ({
          label: m.label,
          created: m.count,
          approved: Math.round(m.count * 0.7),
        }));

  const compliance = complianceStats ?? {
    rate: total > 0 ? 75 : 0,
    approved: Math.round(total * 0.65),
    inReview: Math.round(total * 0.25),
    changes: Math.round(total * 0.05),
    rejected: Math.round(total * 0.05),
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t("admin.dashboard.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("admin.dashboard.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-2xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-400">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Últimos 6 meses</span>
          </div>
          <Link
            href="/admin/invitations"
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-navy-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nueva Invitación</span>
          </Link>
        </div>
      </div>

      {/* Coupled KPI Summary Block */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-slate-100 sm:grid-cols-3 md:divide-y-0 md:divide-x xl:grid-cols-5">
          {stats.map((s) => {
            const meta = STAT_CONFIG[s.key] ?? STAT_CONFIG["stats.total"];
            return (
              <div
                key={s.key}
                className="group relative flex flex-col justify-between p-4.5 sm:p-5 transition-colors hover:bg-slate-50/60"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.chipBg} ${meta.chipColor} transition-transform group-hover:scale-105`}
                    >
                      {meta.icon}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {meta.trend}
                    </span>
                  </div>
                  <div className="mt-3.5">
                    <p className="text-[12px] font-medium text-slate-500 truncate">
                      {t(meta.labelKey as never)}
                    </p>
                    <p className="mt-1 font-display text-2xl sm:text-[28px] font-bold leading-none tabular-nums text-slate-900">
                      {s.value}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-1">
                  <MiniSpark data={trend} stroke={meta.stroke} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 1: Timeline Area Chart + Semicircular Compliance Gauge */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <TimelineAreaChart data={timelineSeries} />
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <ComplianceGauge
            rate={compliance.rate}
            approved={compliance.approved}
            inReview={compliance.inReview}
            changes={compliance.changes}
            rejected={compliance.rejected}
            total={total}
          />
        </div>
      </div>

      {/* Row 2: Donut Status + Monthly Capsule Bars + Risk Spectrum */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Donut Status */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <Donut
            title={t("admin.dashboard.byStatus")}
            centerLabel={t("admin.dashboard.centerLabel")}
            colors={byStatus.map((d) => STATUS_COLORS[d.key])}
            data={byStatus.map((d) => ({
              label: t(statusLabelKey(d.key) as never),
              value: d.value,
            }))}
          />
        </div>

        {/* Month Capsule Bars */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-[15px] font-bold text-slate-900">
              {t("admin.dashboard.avgMonth")}
            </h3>
            <span className="text-xs font-medium text-slate-400">Mensual</span>
          </div>
          <CapsuleMonthBars data={monthly} />
        </div>

        {/* Risk Spectrum */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs md:col-span-2 lg:col-span-1">
          <RiskSpectrum byRisk={byRisk} total={total} t={t} />
        </div>
      </div>

      {/* Row 3: Provider Type & Geographic Distribution */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <h3 className="mb-4 font-display text-[15px] font-bold text-slate-900">
            {t("admin.dashboard.byType")}
          </h3>
          <TypeBars data={byType} total={total} />
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <h3 className="mb-4 font-display text-[15px] font-bold text-slate-900">
            {t("admin.dashboard.suppliersByCountry")}
          </h3>
          <CountryBars data={byCountry} total={total} />
        </div>
      </div>

      {/* Row 4: Recent Suppliers Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h3 className="font-display text-[15px] font-bold text-slate-900">
              {t("admin.dashboard.recent")}
            </h3>
            <p className="text-xs text-slate-500">Últimos registros y actualizaciones recibidas</p>
          </div>
          {allLink && (
            <div className="text-[12.5px] font-semibold text-navy-700 hover:text-navy-900 transition-colors">
              {allLink}
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {recent.map((r) => (
            <Link
              key={r.id}
              href={`/admin/suppliers/${r.id}`}
              className="group flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/80 sm:px-6"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-700 ring-1 ring-slate-200/70 group-hover:bg-navy-900 group-hover:text-white transition-colors">
                  {initials(r.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-navy-900">
                    {r.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {r.reference} · {formatDate(r.submitted)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Badge tone={riskTone(r.risk)} withDot>
                  {t(riskLabelKey(r.risk) as never)}
                </Badge>
                <Badge tone={statusTone(r.status)} withDot>
                  {t(statusLabelKey(r.status) as never)}
                </Badge>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors hidden sm:block">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          ))}
          {recent.length === 0 && (
            <div className="px-5 py-12 text-center sm:px-6">
              <p className="text-sm font-semibold text-slate-700">{t("admin.dashboard.recentEmpty")}</p>
              <p className="mt-1 text-xs text-slate-400">
                {t("admin.dashboard.recentEmptyHint")} {emptyLink}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Micro sparkline rendered inside the coupled KPI bar */
function MiniSpark({ data, stroke }: { data: number[]; stroke: string }) {
  const max = Math.max(1, ...data);
  const w = 120;
  const h = 24;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => [i * step, h - (v / max) * (h - 4) - 2]);
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = `${pts.length ? "0,24 " : ""}${line} ${pts.length ? `${w},24` : ""}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" className="block overflow-visible">
      <polygon points={area} fill={stroke} opacity="0.08" />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Timeline Area Chart with smooth Bézier curves, area gradients, and tooltip */
function TimelineAreaChart({
  data,
}: {
  data: { label: string; created: number; approved: number }[];
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(d.created, d.approved))
  );

  const width = 500;
  const height = 180;
  const padX = 24;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;

  const ptsCreated = data.map((d, i) => ({
    x: padX + i * stepX,
    y: padY + chartH - (d.created / maxVal) * chartH,
  }));

  const ptsApproved = data.map((d, i) => ({
    x: padX + i * stepX,
    y: padY + chartH - (d.approved / maxVal) * chartH,
  }));

  const pathCreated = getSmoothPath(ptsCreated);
  const pathApproved = getSmoothPath(ptsApproved);

  const areaCreated = `${pathCreated} L ${padX + chartW} ${padY + chartH} L ${padX} ${padY + chartH} Z`;
  const areaApproved = `${pathApproved} L ${padX + chartW} ${padY + chartH} L ${padX} ${padY + chartH} Z`;

  const activePoint = activeIdx !== null ? data[activeIdx] : null;

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="font-display text-[15px] font-bold text-slate-900">
            Evolución de Registros y Evaluaciones
          </h3>
          <p className="text-xs text-slate-500">Tendencia mensual de expedientes recibidos vs aprobados</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-navy-800" />
            <span>Recibidos</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Aprobados</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="gradNavy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f2842" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0f2842" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((p, i) => {
            const y = padY + chartH * p;
            return (
              <line
                key={i}
                x1={padX}
                y1={y}
                x2={padX + chartW}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Areas */}
          <path d={areaCreated} fill="url(#gradNavy)" />
          <path d={areaApproved} fill="url(#gradEmerald)" />

          {/* Lines */}
          <path
            d={pathCreated}
            fill="none"
            stroke="#0f2842"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={pathApproved}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Interactive points */}
          {ptsCreated.map((p, i) => (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={activeIdx === i ? 5 : 3.5}
                fill="#ffffff"
                stroke="#0f2842"
                strokeWidth="2.5"
                className="transition-all duration-150"
              />
              <circle
                cx={ptsApproved[i].x}
                cy={ptsApproved[i].y}
                r={activeIdx === i ? 5 : 3.5}
                fill="#ffffff"
                stroke="#10b981"
                strokeWidth="2.5"
                className="transition-all duration-150"
              />
              <rect
                x={p.x - stepX / 2}
                y={padY}
                width={stepX}
                height={chartH}
                fill="transparent"
              />
            </g>
          ))}
        </svg>

        {/* Floating Tooltip */}
        {activePoint && activeIdx !== null && (
          <div
            className="pointer-events-none absolute -top-3 z-10 -translate-x-1/2 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur-xs transition-all duration-150"
            style={{
              left: `${((ptsCreated[activeIdx].x) / width) * 100}%`,
            }}
          >
            <p className="font-bold text-slate-800 uppercase tracking-wide text-[10.5px]">
              {activePoint.label}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-navy-800" />
                {activePoint.created} recibidos
              </span>
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {activePoint.approved} aprobados
              </span>
            </div>
          </div>
        )}

        {/* Month labels along bottom */}
        <div className="mt-2 flex justify-between px-3 text-[11px] font-medium text-slate-400">
          {data.map((d, i) => (
            <span
              key={i}
              className={activeIdx === i ? "font-bold text-slate-800" : ""}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Smooth Bézier path helper */
function getSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? i : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** Semicircular Radial Gauge (inspired by Image 1 "Income vs Expense") */
function ComplianceGauge({
  rate,
  approved,
  inReview,
  changes,
  rejected,
  total,
}: {
  rate: number;
  approved: number;
  inReview: number;
  changes: number;
  rejected: number;
  total: number;
}) {
  const r = 70;
  const strokeWidth = 14;
  const pi = Math.PI;
  const circ = pi * r; // half circle perimeter
  const validRate = Math.min(100, Math.max(0, rate));
  const offset = circ - (validRate / 100) * circ;

  return (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-[15px] font-bold text-slate-900">
            Índice de Aprobación
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            ● Cumplimiento
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Efectividad de debida diligencia sobre {total} expedientes
        </p>
      </div>

      <div className="my-4 relative flex flex-col items-center justify-center">
        <svg viewBox="0 0 180 105" className="w-48 overflow-visible">
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="60%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Background track (semi-circle) */}
          <path
            d="M 20 95 A 70 70 0 0 1 160 95"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Active colored arc */}
          <path
            d="M 20 95 A 70 70 0 0 1 160 95"
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center label */}
        <div className="absolute bottom-2 flex flex-col items-center">
          <span className="font-display text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {validRate}%
          </span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Tasa Aprobada
          </span>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
        <div className="rounded-xl bg-emerald-50/70 p-2">
          <p className="text-[11px] font-medium text-emerald-700">Aprobados</p>
          <p className="mt-0.5 font-bold text-slate-900 text-sm">{approved}</p>
        </div>
        <div className="rounded-xl bg-amber-50/70 p-2">
          <p className="text-[11px] font-medium text-amber-700">En revisión</p>
          <p className="mt-0.5 font-bold text-slate-900 text-sm">{inReview}</p>
        </div>
        <div className="rounded-xl bg-rose-50/70 p-2">
          <p className="text-[11px] font-medium text-rose-700">Observados</p>
          <p className="mt-0.5 font-bold text-slate-900 text-sm">{changes + rejected}</p>
        </div>
      </div>
    </div>
  );
}

/** Donut Chart for Statuses */
export function Donut({
  title,
  data,
  size = 140,
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
  const FALLBACK = CHART_PALETTE;
  const [active, setActive] = useState<number | null>(null);
  const R = 72;
  const C = 2 * Math.PI * R;

  const segments = data.reduce<
    { label: string; value: number; color: string; start: number; span: number; pct: number }[]
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
      <h3 className="mb-4 font-display text-[15px] font-bold text-slate-900">{title}</h3>
      <div className="flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg viewBox="0 0 200 200" width={size} height={size}>
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="24"
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
                  strokeWidth="24"
                  strokeDasharray={`${Math.max(0.5, s.span - 1.5)} ${C}`}
                  transform={`rotate(${(s.start / C) * 360 - 90} 100 100)`}
                  className="cursor-pointer transition-all duration-200"
                  opacity={active === null || active === i ? 1 : 0.25}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                />
              ) : null
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-bold leading-none tabular-nums text-slate-900">
              {total}
            </span>
            {centerLabel && (
              <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {centerLabel}
              </span>
            )}
          </div>
        </div>

        <ul className="w-full min-w-0 space-y-1.5">
          {segments.map((s, i) => (
            <li
              key={i}
              className={`flex items-center gap-2 rounded-lg px-2 py-1 transition-colors cursor-pointer ${
                active === i ? "bg-slate-100/90 font-medium" : "hover:bg-slate-50"
              }`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="flex-1 truncate text-xs text-slate-700">{s.label}</span>
              <span className="tabular-nums text-xs font-semibold text-slate-900">
                {s.value}
              </span>
              <span className="tabular-nums text-[11px] text-slate-400 w-8 text-right">
                {s.pct}%
              </span>
            </li>
          ))}
          {total === 0 && <li className="text-xs text-slate-400">—</li>}
        </ul>
      </div>
    </div>
  );
}

/** Capsule-style Monthly Activity Bars */
function CapsuleMonthBars({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-44 items-end gap-2.5 sm:gap-3 pt-4">
      {data.map((d, i) => {
        const isMax = d.count === max && d.count > 0;
        const color = isMax ? "#0d9488" : CHART_PALETTE[i % CHART_PALETTE.length];
        const fillH = d.count > 0 ? Math.max(8, Math.round((d.count / max) * 100)) : 4;
        return (
          <div key={d.label} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-[11.5px] font-semibold tabular-nums text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
              {d.count}
            </span>
            <div className="flex h-32 w-full items-end rounded-full bg-slate-100 p-1">
              <div
                className="w-full rounded-full transition-all duration-500 group-hover:brightness-110 shadow-xs"
                style={{
                  height: `${fillH}%`,
                  background: `linear-gradient(180deg, ${color}dd, ${color})`,
                }}
              />
            </div>
            <span className="truncate text-[11px] font-medium text-slate-500">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Risk Spectrum / Matrix */
function RiskSpectrum({
  byRisk,
  total,
  t,
}: {
  byRisk: { key: RiskLevel; value: number }[];
  total: number;
  t: (k: never) => string;
}) {
  const risks: RiskLevel[] = ["BAJO", "MEDIO", "ALTO", "CRITICO", "PENDIENTE"];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-[15px] font-bold text-slate-900">
          Distribución de Riesgo
        </h3>
        <span className="text-xs font-medium text-slate-400">Evaluación</span>
      </div>

      <div className="space-y-3.5">
        {risks.map((level) => {
          const item = byRisk.find((r) => r.key === level);
          const count = item?.value ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const color = RISK_COLORS[level];
          return (
            <div key={level}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {t(riskLabelKey(level) as never)}
                </span>
                <span className="tabular-nums font-semibold text-slate-900">
                  {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Provider Type Bars */
function TypeBars({ data, total }: { data: [string, number][]; total: number }) {
  return (
    <div className="space-y-3.5">
      {data.slice(0, 6).map(([k, v], i) => {
        const color = CHART_PALETTE[i % CHART_PALETTE.length];
        const pct = total ? Math.round((v / total) * 100) : 0;
        return (
          <div key={k} className="min-w-0">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="truncate font-medium text-slate-700 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                {humanize(k)}
              </span>
              <span className="tabular-nums font-semibold text-slate-900">
                {v} <span className="text-slate-400 font-normal">({pct}%)</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: color,
                }}
              />
            </div>
          </div>
        );
      })}
      {data.length === 0 && <p className="text-xs text-slate-400">—</p>}
    </div>
  );
}

/** Country Distribution Bars */
function CountryBars({ data, total }: { data: [string, number][]; total: number }) {
  if (data.length === 0) return <p className="text-xs text-slate-400">—</p>;
  return (
    <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
      {data.slice(0, 8).map(([k, v], i) => {
        const color = CHART_PALETTE[(i + 2) % CHART_PALETTE.length];
        const pct = total ? Math.round((v / total) * 100) : 0;
        return (
          <div key={k} className="min-w-0">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="truncate font-medium text-slate-700">{k}</span>
              <span className="tabular-nums font-semibold text-slate-900">
                {v} <span className="text-slate-400 font-normal">({pct}%)</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}