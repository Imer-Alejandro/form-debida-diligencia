import Link from "next/link";
import { getAdminSession } from "@/lib/supabase/auth";
import type { RegistrationRow, RiskLevel, RegistrationStatus } from "@/lib/types";
import {
  Dashboard,
  type DashboardFilters,
  type DashboardPeriod,
  type StatPoint,
} from "@/components/admin/Dashboard";
import { ALL_RISKS, ALL_STATUSES, COUNTRIES, PROVIDER_TYPES } from "@/components/admin/tones";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await getAdminSession();
  const params = await searchParams;
  const periodParam = getParam(params.period);
  const period: DashboardPeriod = ["12m", "all", "custom"].includes(periodParam)
    ? (periodParam as DashboardPeriod)
    : "6m";
  const filters: DashboardFilters = {
    period,
    from: period === "custom" ? validDate(getParam(params.from)) : "",
    to: period === "custom" ? validDate(getParam(params.to)) : "",
    status: ALL_STATUSES.find((value) => value === getParam(params.status)) ?? "",
    risk: ALL_RISKS.find((value) => value === getParam(params.risk)) ?? "",
    type: PROVIDER_TYPES.find((value) => value === getParam(params.type)) ?? "",
    country: COUNTRIES.find((value) => value === getParam(params.country)) ?? "",
  };
  const now = new Date();
  const monthsToShow = period === "6m" ? 6 : 12;
  const startDate = filters.from
    ? new Date(`${filters.from}T00:00:00.000Z`)
    : period === "all" || period === "custom"
      ? null
      : new Date(now.getFullYear(), now.getMonth() - monthsToShow + 1, 1);
  const endDate = filters.to ? new Date(`${filters.to}T00:00:00.000Z`) : null;
  const endExclusive = endDate ? new Date(endDate.getTime() + 24 * 60 * 60 * 1000) : null;
  const invalidDateRange = Boolean(startDate && endDate && startDate > endDate);

  let regs: Pick<
    RegistrationRow,
    | "id"
    | "reference_no"
    | "company_name"
    | "commercial_name"
    | "provider_type"
    | "status"
    | "risk_level"
    | "country"
    | "created_at"
    | "submitted_at"
  >[] = [];

  if (!invalidDateRange) {
    let registrationsQuery = supabase
      .from("supplier_registrations")
      .select(
        "id, reference_no, company_name, commercial_name, provider_type, status, risk_level, country, created_at, submitted_at"
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (startDate) registrationsQuery = registrationsQuery.gte("created_at", startDate.toISOString());
    if (endExclusive) registrationsQuery = registrationsQuery.lt("created_at", endExclusive.toISOString());
    if (filters.status) registrationsQuery = registrationsQuery.eq("status", filters.status);
    if (filters.risk) registrationsQuery = registrationsQuery.eq("risk_level", filters.risk);
    if (filters.type) registrationsQuery = registrationsQuery.eq("provider_type", filters.type);
    if (filters.country) registrationsQuery = registrationsQuery.eq("country", filters.country);

    const { data } = await registrationsQuery;
    regs = (data ?? []) as typeof regs;
  }

  const total = regs.length;
  const byStatus = countBy(regs.map((r) => r.status));
  const byRisk = countBy(regs.map((r) => r.risk_level));
  const byCountry = countBy(regs.map((r) => r.country || "—"));
  const byType = countBy(regs.map((r) => r.provider_type || "OTRO"));
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonth = regs.filter((r) => r.created_at >= firstOfMonth).length;

  let docsCount = 0;
  if (regs.length > 0) {
    const { count } = await supabase
      .from("registration_documents")
      .select("*", { count: "exact", head: true })
      .in("registration_id", regs.map((registration) => registration.id));
    docsCount = count ?? 0;
  }

  const monthly: { label: string; count: number }[] = [];
  const monthlyTimeline: { label: string; created: number; approved: number }[] = [];
  const chartEnd = endDate ?? now;
  const chartMonths =
    period === "custom" && startDate
      ? Math.max(
          1,
          Math.min(
            12,
            (chartEnd.getFullYear() - startDate.getFullYear()) * 12 +
              chartEnd.getMonth() -
              startDate.getMonth() +
              1
          )
        )
      : monthsToShow;

  for (let i = chartMonths - 1; i >= 0; i--) {
    const d = new Date(chartEnd.getFullYear(), chartEnd.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const inMonth = regs.filter((r) => {
      const c = new Date(r.created_at);
      return c >= start && c < end;
    });
    const label = start.toLocaleDateString("es", { month: "short" });
    monthly.push({
      label,
      count: inMonth.length,
    });
    monthlyTimeline.push({
      label,
      created: inMonth.length,
      approved: inMonth.filter(
        (r) => r.status === "APROBADO" || r.status === "APROBADO_CONDICIONES"
      ).length,
    });
  }

  const approvedCount = (byStatus.APROBADO ?? 0) + (byStatus.APROBADO_CONDICIONES ?? 0);
  const reviewedCount = total - (byStatus.BORRADOR ?? 0);
  const complianceRate =
    reviewedCount > 0
      ? Math.round((approvedCount / reviewedCount) * 100)
      : total > 0
        ? Math.round((approvedCount / total) * 100)
        : 0;

  const complianceStats = {
    rate: complianceRate,
    approved: approvedCount,
    inReview: (byStatus.EN_REVISION ?? 0) + (byStatus.PENDIENTE ?? 0),
    changes: byStatus.SOLICITUD_CAMBIOS ?? 0,
    rejected: byStatus.RECHAZADO ?? 0,
  };

  const recent = regs.slice(0, 8).map((r) => ({
    id: r.id,
    name: r.company_name || r.commercial_name || "—",
    reference: r.reference_no ?? "",
    submitted: r.submitted_at ?? r.created_at,
    status: r.status,
    risk: r.risk_level,
  }));

  const stats: StatPoint[] = [
    { key: "stats.total", value: total },
    { key: "stats.pending", value: byStatus.PENDIENTE ?? 0 },
    { key: "stats.drafts", value: byStatus.BORRADOR ?? 0 },
    { key: "stats.docs", value: docsCount ?? 0 },
    { key: "stats.thisMonth", value: thisMonth },
  ];

  return (
    <Dashboard
      filters={filters}
      invalidDateRange={invalidDateRange}
      stats={stats}
      byStatus={Object.entries(byStatus).map(([k, v]) => ({
        key: k as RegistrationStatus,
        value: v,
      }))}
      byRisk={Object.entries(byRisk).map(([k, v]) => ({
        key: k as RiskLevel,
        value: v,
      }))}
      byCountry={Object.entries(byCountry).sort((a, b) => b[1] - a[1])}
      byType={Object.entries(byType).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))}
      monthly={monthly}
      monthlyTimeline={monthlyTimeline}
      complianceStats={complianceStats}
      recent={recent}
      allLink={
        <Link
          href="/admin/suppliers"
          className="text-[12.5px] font-semibold text-navy-700 hover:text-navy-900 hover:underline"
        >
          Ver todos
        </Link>
      }
      emptyLink={
        <Link href="/admin/invitations" className="text-navy-700 font-semibold underline">
          Invitaciones
        </Link>
      }
    />
  );
}

function getParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function validDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? value
    : "";
}

function countBy<T extends string>(arr: T[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of arr) out[v] = (out[v] ?? 0) + 1;
  return out;
}