import Link from "next/link";
import { getAdminSession } from "@/lib/supabase/auth";
import type { RegistrationRow } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui";
import { statusTone, riskTone } from "@/components/admin/tones";
import { SuppliersFilters } from "@/components/admin/SuppliersFilters";

export const dynamic = "force-dynamic";

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const s = (v: string | string[] | undefined) =>
    typeof v === "string" ? v.trim() : "";
  const q = s(sp.q);
  const status = s(sp.status).toUpperCase();
  const risk = s(sp.risk).toUpperCase();
  const providerType = s(sp.type);
  const country = s(sp.country);
  const tag = s(sp.tag);

  const { supabase } = await getAdminSession();

  let query = supabase
    .from("supplier_registrations")
    .select(
      "id, reference_no, company_name, commercial_name, provider_type, status, risk_level, tax_id, country, tags, submitted_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) query = query.or(`company_name.ilike.%${q}%,commercial_name.ilike.%${q}%,reference_no.ilike.%${q}%,tax_id.ilike.%${q}%`);
  if (status) query = query.eq("status", status);
  if (risk) query = query.eq("risk_level", risk);
  if (providerType) query = query.eq("provider_type", providerType);
  if (country) query = query.eq("country", country);
  if (tag) query = query.contains("tags", [tag]);

  const { data: rows } = await query;

  const regs = (rows ?? []) as Pick<
    RegistrationRow,
    | "id"
    | "reference_no"
    | "company_name"
    | "commercial_name"
    | "provider_type"
    | "status"
    | "risk_level"
    | "tax_id"
    | "country"
    | "tags"
    | "submitted_at"
    | "created_at"
  >[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
          Proveedores
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Gestione, evalúe y filtre los registros recibidos.
        </p>
      </div>

      <SuppliersFilters />

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-[11.5px] uppercase tracking-wide text-ink-muted">
              <th className="border-b border-navy-800/10 px-3 py-2.5">Referencia</th>
              <th className="border-b border-navy-800/10 px-3 py-2.5">Proveedor</th>
              <th className="border-b border-navy-800/10 px-3 py-2.5">País</th>
              <th className="border-b border-navy-800/10 px-3 py-2.5">Enviado</th>
              <th className="border-b border-navy-800/10 px-3 py-2.5">Riesgo</th>
              <th className="border-b border-navy-800/10 px-3 py-2.5">Estado</th>
              <th className="border-b border-navy-800/10 px-3 py-2.5 text-right">Etiquetas</th>
            </tr>
          </thead>
          <tbody>
            {regs.map((r) => (
              <tr key={r.id} className="group transition-colors hover:bg-bone-100/60">
                <td className="border-b border-navy-800/5 px-3 py-3 text-[12.5px] tabular-nums text-ink-muted">
                  <Link href={`/admin/suppliers/${r.id}`} className="text-navy-700 underline underline-offset-2">
                    {r.reference_no}
                  </Link>
                </td>
                <td className="border-b border-navy-800/5 px-3 py-3">
                  <Link href={`/admin/suppliers/${r.id}`} className="block max-w-[220px]">
                    <p className="truncate text-sm font-medium text-ink">
                      {r.company_name || r.commercial_name || "—"}
                    </p>
                    <p className="truncate text-[12px] text-ink-muted">{r.tax_id}</p>
                  </Link>
                </td>
                <td className="border-b border-navy-800/5 px-3 py-3 text-[12.5px] text-ink-soft">
                  {r.country || "—"}
                </td>
                <td className="border-b border-navy-800/5 px-3 py-3 text-[12.5px] text-ink-soft">
                  {formatDate(r.submitted_at ?? r.created_at)}
                </td>
                <td className="border-b border-navy-800/5 px-3 py-3">
                  <Badge tone={riskTone(r.risk_level)}>{riskLabel(r.risk_level)}</Badge>
                </td>
                <td className="border-b border-navy-800/5 px-3 py-3">
                  <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                </td>
                <td className="border-b border-navy-800/5 px-3 py-3">
                  <div className="flex justify-end gap-1">
                    {r.tags?.slice(0, 2).map((t) => (
                      <span key={t} className="rounded-full bg-navy-800/10 px-2 py-0.5 text-[11px] text-ink-soft">
                        {t}
                      </span>
                    ))}
                    {(r.tags?.length ?? 0) > 2 && (
                      <span className="rounded-full bg-navy-800/10 px-2 py-0.5 text-[11px] text-ink-muted">
                        +{(r.tags?.length ?? 0) - 2}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {regs.length === 0 && (
          <p className="rounded-2xl border border-navy-800/10 bg-white px-6 py-12 text-center text-sm text-ink-muted">
            No hay registros que coincidan con los filtros.
          </p>
        )}
      </div>
    </div>
  );
}

function statusLabel(s: RegistrationRow["status"]): string {
  const map = {
    BORRADOR: "Borrador",
    PENDIENTE: "Pendiente",
    EN_REVISION: "En revisión",
    SOLICITUD_CAMBIOS: "Solicitud de cambios",
    APROBADO: "Aprobado",
    APROBADO_CONDICIONES: "Aprobado con condiciones",
    RECHAZADO: "Rechazado",
  } as const;
  return map[s];
}

function riskLabel(r: RegistrationRow["risk_level"]): string {
  const map = {
    PENDIENTE: "Sin clasificar",
    BAJO: "Bajo",
    MEDIO: "Medio",
    ALTO: "Alto",
    CRITICO: "Crítico",
  } as const;
  return map[r];
}