"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Badge, Button, Select, Textarea, type BadgeTone } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import {
  INCIDENT_ACTIONS,
  allowedIncidentTransitions,
  normalizeIncidentStatus,
  type IncidentStatus,
} from "@/lib/process";

type TokenRow = {
  id: string;
  kind: string;
  area: string | null;
  status: string;
  token: string;
  created_at: string;
};
type ServiceRow = {
  id: string;
  area: string | null;
  purchase_date: string | null;
  category: string | null;
  recommendation: string | null;
  quality: number | null;
  delivery: number | null;
  price: number | null;
  compliance: number | null;
  service: number | null;
  comments: string | null;
  created_at: string;
};
type IncidentRow = {
  id: string;
  area: string | null;
  incident_date: string | null;
  kind: string | null;
  description: string | null;
  impact: string | null;
  severity: string;
  status: string;
  recommended_action: string;
  resolution_notes: string | null;
  reported_by: string | null;
  contact: string | null;
  created_at: string;
};

const SEVERITY_TONE: Record<string, BadgeTone> = { BAJA: "gray", MEDIA: "amber", ALTA: "red" };
const INCIDENT_TONE: Record<string, BadgeTone> = {
  ABIERTA: "red",
  EN_SEGUIMIENTO: "amber",
  CORRECCION_SOLICITADA: "amber",
  RESUELTA: "green",
  CERRADA: "gray",
};
const LINK_TONE: Record<string, BadgeTone> = {
  PENDIENTE: "amber",
  USADO: "green",
  EXPIRADO: "gray",
};

type InternalData = {
  tokens?: TokenRow[];
  serviceEvaluations?: ServiceRow[];
  incidents?: IncidentRow[];
};

async function fetchInternalData(registrationId: string): Promise<InternalData | null> {
  const res = await fetch(
    `/api/admin/internal-links?registrationId=${encodeURIComponent(registrationId)}`
  );
  const json = await res.json().catch(() => null);
  return res.ok && json ? (json as InternalData) : null;
}

export function InternalReportsPanel({ registrationId }: { registrationId: string }) {
  const { t } = useI18n();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const applyData = useCallback((json: InternalData | null) => {
    setTokens(json?.tokens ?? []);
    setServices(json?.serviceEvaluations ?? []);
    setIncidents(json?.incidents ?? []);
  }, []);

  const load = useCallback(async () => {
    applyData(await fetchInternalData(registrationId));
    setLoading(false);
  }, [registrationId, applyData]);

  useEffect(() => {
    (async () => {
      applyData(await fetchInternalData(registrationId));
      setLoading(false);
    })();
  }, [registrationId, applyData]);

  const linkUrl = (token: string) =>
    typeof window === "undefined" ? "" : `${window.location.origin}/interno/${token}`;

  const createLink = async (kind: "FIRST_PURCHASE" | "INCIDENT") => {
    const area = window.prompt(t("admin.internal.areaPrompt"), "") ?? "";
    setBusy(kind);
    try {
      const res = await fetch("/api/admin/internal-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, kind, area }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(null);
    }
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(linkUrl(token));
      setCopied(token);
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="rounded-2xl border border-navy-800/10 bg-white p-5">
      <h2 className="font-display text-[15px] font-semibold text-navy-900">
        {t("admin.internal.title")}
      </h2>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
        {t("admin.internal.help")}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void createLink("FIRST_PURCHASE")}
          disabled={busy !== null}
        >
          + {t("admin.internal.newFirstPurchase")}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void createLink("INCIDENT")}
          disabled={busy !== null}
        >
          + {t("admin.internal.newIncident")}
        </Button>
      </div>

      <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
        {t("admin.internal.links")}
      </p>
      {loading ? (
        <p className="mt-1 text-[12px] text-ink-muted">{t("common.loading")}</p>
      ) : tokens.length === 0 ? (
        <p className="mt-1 text-[12px] text-ink-muted">{t("admin.internal.noLinks")}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {tokens.map((tok) => (
            <li
              key={tok.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-navy-800/10 px-2.5 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Badge tone={tok.kind === "INCIDENT" ? "red" : "blue"} withDot={false}>
                  {t(`admin.internal.kinds.${tok.kind}` as never)}
                </Badge>
                <span className="truncate text-[12px] text-ink-muted">
                  {tok.area || "—"} · {formatDate(tok.created_at)}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone={LINK_TONE[tok.status] ?? "gray"} withDot>
                  {t(`admin.internal.statuses.${tok.status}` as never)}
                </Badge>
                <button
                  type="button"
                  onClick={() => void copy(tok.token)}
                  className="text-[11px] font-medium text-navy-700 underline underline-offset-2"
                >
                  {copied === tok.token ? t("admin.internal.copied") : t("admin.internal.copy")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
        {t("admin.internal.serviceTitle")}
      </p>
      {services.length === 0 ? (
        <p className="mt-1 text-[12px] text-ink-muted">{t("admin.internal.noService")}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {services.map((s) => (
            <li key={s.id} className="rounded-lg border border-navy-800/10 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12.5px] font-medium text-ink">
                  {s.area || "—"}
                  {s.purchase_date ? ` · ${formatDate(s.purchase_date)}` : ""}
                </span>
                <Badge
                  tone={
                    s.recommendation === "CAMBIAR"
                      ? "red"
                      : s.recommendation === "MEJORAR"
                        ? "amber"
                        : "green"
                  }
                >
                  {t(`admin.internal.recommendations.${s.recommendation ?? "SEGUIR"}` as never)}
                </Badge>
              </div>
              <p className="mt-1 text-[11.5px] text-ink-muted">
                {t("admin.internal.avg")}:{" "}
                {avgRating(s).toFixed(1)} / 5
                {s.comments ? ` · ${s.comments}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
        {t("admin.internal.incidentsTitle")}
      </p>
      {incidents.length === 0 ? (
        <p className="mt-1 text-[12px] text-ink-muted">{t("admin.internal.noIncidents")}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {incidents.map((inc) => (
            <IncidentItem key={inc.id} incident={inc} onSaved={load} />
          ))}
        </ul>
      )}
    </section>
  );
}

function avgRating(s: ServiceRow): number {
  const vals = [s.quality, s.delivery, s.price, s.compliance, s.service].filter(
    (v): v is number => typeof v === "number"
  );
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function IncidentItem({ incident, onSaved }: { incident: IncidentRow; onSaved: () => Promise<void> }) {
  const { t } = useI18n();
  const current = normalizeIncidentStatus(incident.status);
  const [status, setStatus] = useState<IncidentStatus>(current);
  const [action, setAction] = useState(incident.recommended_action || "NINGUNO");
  const [notes, setNotes] = useState(incident.resolution_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = [current, ...allowedIncidentTransitions(current)];

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: incident.id,
          status,
          recommendedAction: action,
          resolutionNotes: notes,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
        await onSaved();
      } else {
        const json = await res.json().catch(() => null);
        setError(json?.error === "validation" ? t("validation.requiredField") : t("docs.error"));
      }
    } catch {
      setError(t("docs.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="rounded-lg border border-navy-800/10 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-ink">
          {incident.area || "—"}
          {incident.incident_date ? ` · ${formatDate(incident.incident_date)}` : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <Badge tone={SEVERITY_TONE[incident.severity] ?? "gray"} withDot={false}>
            {t(`admin.internal.severities.${incident.severity}` as never)}
          </Badge>
          <Badge tone={INCIDENT_TONE[incident.status] ?? "gray"} withDot>
            {t(`admin.internal.incidentStatuses.${incident.status}` as never)}
          </Badge>
        </span>
      </div>
      {incident.description && (
        <p className="mt-1 text-[11.5px] leading-snug text-ink-muted">{incident.description}</p>
      )}

      {current !== "CERRADA" && (
        <div className="mt-2 space-y-2 rounded-lg bg-bone-50/60 p-2.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                {t("admin.internal.statusLabel")}
              </span>
              <Select
                className="h-8 text-[12px]"
                value={status}
                onChange={(e) => setStatus(normalizeIncidentStatus(e.target.value))}
              >
                {options.map((st) => (
                  <option key={st} value={st}>
                    {t(`admin.internal.incidentStatuses.${st}` as never)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                {t("admin.internal.action")}
              </span>
              <Select
                className="h-8 text-[12px]"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                {INCIDENT_ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {t(`admin.internal.actions.${a}` as never)}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <Textarea
            className="text-[12px]"
            rows={2}
            placeholder={t("admin.internal.notes")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? t("admin.internal.saving") : t("admin.internal.save")}
            </Button>
            {saved && <span className="text-[11px] font-medium text-success">{t("admin.internal.saved")}</span>}
            {error && <span className="text-[11px] text-danger">{error}</span>}
          </div>
        </div>
      )}
    </li>
  );
}
