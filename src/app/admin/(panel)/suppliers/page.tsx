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
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Proveedores
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestione, evalúe y filtre los registros de debida diligencia recibidos.
        </p>
      </div>

      <SuppliersFilters />

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200/80">
                <th className="border-b border-slate-200/70 px-4 py-3">Referencia</th>
                <th className="border-b border-slate-200/70 px-4 py-3">Proveedor</th>
                <th className="border-b border-slate-200/70 px-4 py-3">País</th>
                <th className="border-b border-slate-200/70 px-4 py-3">Enviado</th>
                <th className="border-b border-slate-200/70 px-4 py-3">Riesgo</th>
                <th className="border-b border-slate-200/70 px-4 py-3">Estado</th>
                <th className="border-b border-slate-200/70 px-4 py-3 text-right">Etiquetas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regs.map((r) => {
                const name = r.company_name || r.commercial_name || "—";
                const initials = name.slice(0, 2).toUpperCase();
                return (
                  <tr key={r.id} className="group transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 text-[12.5px] tabular-nums font-medium text-slate-600">
                      <Link href={`/admin/suppliers/${r.id}`} className="text-navy-800 hover:text-navy-950 font-semibold hover:underline">
                        {r.reference_no}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/admin/suppliers/${r.id}`} className="flex items-center gap-3 max-w-[260px]">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200/60 group-hover:bg-navy-900 group-hover:text-white transition-colors">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800 group-hover:text-navy-900">
                            {name}
                          </p>
                          <p className="truncate text-xs text-slate-400 font-mono">{r.tax_id}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-slate-600 font-medium">
                      {r.country || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-[12.5px] text-slate-500">
                      {formatDate(r.submitted_at ?? r.created_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={riskTone(r.risk_level)} withDot>{riskLabel(r.risk_level)}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={statusTone(r.status)} withDot>{statusLabel(r.status)}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1.5">
                        {r.tags?.slice(0, 2).map((t) => (
                          <span key={t} className="rounded-full bg-slate-100 border border-slate-200/70 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {t}
                          </span>
                        ))}
                        {(r.tags?.length ?? 0) > 2 && (
                          <span className="rounded-full bg-slate-100 border border-slate-200/70 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                            +{(r.tags?.length ?? 0) - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {regs.length === 0 && (
          <div className="px-6 py-16 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto h-10 w-10 text-slate-300">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="mt-3 text-sm font-semibold text-slate-700">No hay registros que coincidan</p>
            <p className="mt-1 text-xs text-slate-400">Pruebe a cambiar los criterios de búsqueda o filtros.</p>
          </div>
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