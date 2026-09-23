import Link from "next/link";
import { getAdminSession } from "@/lib/supabase/auth";
import type { RegistrationRow, RiskLevel, RegistrationStatus } from "@/lib/types";
import { Dashboard, type StatPoint } from "@/components/admin/Dashboard";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { supabase } = await getAdminSession();

  const { data: rows } = await supabase
    .from("supplier_registrations")
    .select(
      "id, reference_no, company_name, commercial_name, provider_type, status, risk_level, country, created_at, submitted_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const regs = (rows ?? []) as Pick<
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
  >[];

  const total = regs.length;
  const byStatus = countBy(regs.map((r) => r.status));
  const byRisk = countBy(regs.map((r) => r.risk_level));
  const byCountry = countBy(regs.map((r) => r.country || "—"));
  const byType = countBy(regs.map((r) => r.provider_type || "OTRO"));
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonth = regs.filter((r) => r.created_at >= firstOfMonth).length;

  const { count: docsCount } = await supabase
    .from("registration_documents")
    .select("*", { count: "exact", head: true });

  const monthly: { label: string; count: number }[] = [];
  const monthlyTimeline: { label: string; created: number; approved: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
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

function countBy<T extends string>(arr: T[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of arr) out[v] = (out[v] ?? 0) + 1;
  return out;
}