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
      "id, reference_no, company_name, commercial_name, status, risk_level, country, created_at, submitted_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const regs = (rows ?? []) as Pick<
    RegistrationRow,
    | "id"
    | "reference_no"
    | "company_name"
    | "commercial_name"
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
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonth = regs.filter((r) => r.created_at >= firstOfMonth).length;

  const monthly: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    monthly.push({
      label: start.toLocaleDateString("es", { month: "short" }),
      count: regs.filter((r) => {
        const c = new Date(r.created_at);
        return c >= start && c < end;
      }).length,
    });
  }

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
      monthly={monthly}
      recent={recent}
      allLink={
        <Link
          href="/admin/suppliers"
          className="text-[12.5px] font-medium text-navy-700 underline underline-offset-2"
        >
          Ver todos
        </Link>
      }
      emptyLink={
        <Link href="/admin/invitations" className="text-navy-700 underline">
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