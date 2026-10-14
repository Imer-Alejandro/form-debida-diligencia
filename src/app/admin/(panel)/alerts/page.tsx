import { getAdminSession } from "@/lib/supabase/auth";
import { getServerDict } from "@/lib/i18n/server";
import { Badge, type BadgeTone } from "@/components/ui";
import { RunAlertsButton } from "@/components/admin/RunAlertsButton";

export const dynamic = "force-dynamic";

interface AlertListItem {
  id: number;
  kind: string;
  audience: string;
  recipient: string | null;
  subject: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
  error: string | null;
  context: Record<string, unknown> | null;
  due_at: string | null;
}

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "amber",
  SENT: "green",
  FAILED: "red",
  SKIPPED: "gray",
};

function fmt(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-ES", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminAlertsPage() {
  const dict = await getServerDict();
  const a = dict.admin.alerts;

  const { supabase } = await getAdminSession();

  const { data } = await supabase
    .from("supplier_alerts")
    .select(
      "id, kind, audience, recipient, subject, status, sent_at, created_at, error, context, due_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const items = (data ?? []) as AlertListItem[];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
            {a.title}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{a.subtitle}</p>
        </div>
        <RunAlertsButton />
      </div>

      <p className="mb-6 rounded-2xl border border-navy-800/10 bg-navy-50/40 px-4 py-3 text-[12.5px] leading-relaxed text-ink-muted">
        {a.configNote}
      </p>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-navy-800/10 bg-white px-6 py-12 text-center text-sm text-ink-muted">
          {a.empty}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">{a.colKind}</th>
                <th className="px-4 py-3">{a.colAudience}</th>
                <th className="px-4 py-3">{a.colRecipient}</th>
                <th className="px-4 py-3">{a.colStatus}</th>
                <th className="px-4 py-3">{a.colCreated}</th>
                <th className="px-4 py-3">{a.colSent}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row) => {
                const ctx = row.context ?? {};
                const company = (ctx.company as string) || "";
                const reference = (ctx.reference as string) || "";
                const kindLabel =
                  (a.kinds as Record<string, string>)[row.kind] ?? row.kind;
                const audienceLabel =
                  (a.audiences as Record<string, string>)[row.audience] ?? row.audience;
                const statusLabel =
                  (a.alertStatuses as Record<string, string>)[row.status] ?? row.status;
                return (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-3">
                      <span className="block font-medium text-slate-800">{kindLabel}</span>
                      {(company || reference) && (
                        <span className="block text-[12px] text-slate-500">
                          {company}
                          {reference ? ` · ${reference}` : ""}
                        </span>
                      )}
                      {row.error && (
                        <span className="block text-[12px] text-rose-500">{row.error}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{audienceLabel}</td>
                    <td className="px-4 py-3 text-slate-600">{row.recipient ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[row.status] ?? "gray"}>{statusLabel}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmt(row.created_at)}</td>
                    <td className="px-4 py-3 text-slate-500">{fmt(row.sent_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
