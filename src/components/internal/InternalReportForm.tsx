"use client";

import { useState } from "react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export type InternalKind = "FIRST_PURCHASE" | "INCIDENT";

const RATING_FIELDS = ["quality", "delivery", "price", "compliance", "service"] as const;
const RECOMMENDATIONS = ["SEGUIR", "MEJORAR", "CAMBIAR"] as const;
const SEVERITIES = ["BAJA", "MEDIA", "ALTA"] as const;

export function InternalReportForm({
  token,
  kind,
  defaultArea,
  company,
  reference,
}: {
  token: string;
  kind: InternalKind;
  defaultArea: string;
  company: string;
  reference: string;
}) {
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [service, setService] = useState({
    area: defaultArea,
    purchaseDate: "",
    category: "",
    quality: "5",
    delivery: "5",
    price: "5",
    compliance: "5",
    service: "5",
    comments: "",
    recommendation: "SEGUIR",
  });

  const [incident, setIncident] = useState({
    area: defaultArea,
    incidentDate: "",
    kind: "",
    severity: "MEDIA",
    description: "",
    impact: "",
    reportedBy: "",
    contact: "",
  });

  const submit = async () => {
    setSubmitting(true);
    setFormError(null);
    setErrors({});

    const payload =
      kind === "FIRST_PURCHASE"
        ? {
            area: service.area,
            purchaseDate: service.purchaseDate,
            category: service.category,
            quality: Number(service.quality),
            delivery: Number(service.delivery),
            price: Number(service.price),
            compliance: Number(service.compliance),
            service: Number(service.service),
            comments: service.comments,
            recommendation: service.recommendation,
          }
        : {
            area: incident.area,
            incidentDate: incident.incidentDate,
            kind: incident.kind,
            severity: incident.severity,
            description: incident.description,
            impact: incident.impact,
            reportedBy: incident.reportedBy,
            contact: incident.contact,
          };

    try {
      const res = await fetch("/api/internal/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, data: payload }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        setDone(true);
      } else if (json?.error === "validation" && json.errors) {
        setErrors(json.errors as Record<string, string>);
      } else if (json?.error === "already_used") {
        setFormError(t("internal.usedBody"));
      } else if (json?.error === "expired_token" || json?.error === "invalid_token") {
        setFormError(t("internal.expiredBody"));
      } else {
        setFormError(t("internal.submitError"));
      }
    } catch {
      setFormError(t("internal.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <StatusCard title={t("internal.successTitle")} body={t("internal.successBody")} tone="ok" />
    );
  }

  const err = (field: string) =>
    errors[field] ? t("internal.required") : undefined;

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-xl font-semibold text-navy-900 sm:text-2xl">
        {kind === "FIRST_PURCHASE" ? t("internal.firstPurchaseTitle") : t("internal.incidentTitle")}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {t("internal.intro", { company: company || "—", reference: reference || "—" })}
      </p>

      <div className="mt-6 space-y-4">
        <Field label={t("internal.area")} required error={err("area")}>
          <Input
            value={kind === "FIRST_PURCHASE" ? service.area : incident.area}
            onChange={(e) =>
              kind === "FIRST_PURCHASE"
                ? setService({ ...service, area: e.target.value })
                : setIncident({ ...incident, area: e.target.value })
            }
          />
        </Field>

        {kind === "FIRST_PURCHASE" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("internal.purchaseDate")}>
                <Input
                  type="date"
                  value={service.purchaseDate}
                  onChange={(e) => setService({ ...service, purchaseDate: e.target.value })}
                />
              </Field>
              <Field label={t("internal.category")}>
                <Input
                  value={service.category}
                  onChange={(e) => setService({ ...service, category: e.target.value })}
                />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-medium text-ink">{t("internal.ratingsTitle")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {RATING_FIELDS.map((f) => (
                  <Field key={f} label={t(`internal.${f}` as never)} error={err(f)}>
                    <Select
                      value={service[f]}
                      onChange={(e) => setService({ ...service, [f]: e.target.value })}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ))}
              </div>
            </div>

            <Field label={t("internal.recommendation")} error={err("recommendation")}>
              <Select
                value={service.recommendation}
                onChange={(e) => setService({ ...service, recommendation: e.target.value })}
              >
                {RECOMMENDATIONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`internal.recommendations.${r}` as never)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={t("internal.comments")}>
              <Textarea
                rows={3}
                value={service.comments}
                onChange={(e) => setService({ ...service, comments: e.target.value })}
              />
            </Field>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("internal.incidentDate")} required error={err("incidentDate")}>
                <Input
                  type="date"
                  value={incident.incidentDate}
                  onChange={(e) => setIncident({ ...incident, incidentDate: e.target.value })}
                />
              </Field>
              <Field label={t("internal.severity")}>
                <Select
                  value={incident.severity}
                  onChange={(e) => setIncident({ ...incident, severity: e.target.value })}
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {t(`internal.severities.${s}` as never)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label={t("internal.incidentKind")}>
              <Input
                value={incident.kind}
                onChange={(e) => setIncident({ ...incident, kind: e.target.value })}
              />
            </Field>

            <Field label={t("internal.description")} required error={err("description")}>
              <Textarea
                rows={3}
                value={incident.description}
                onChange={(e) => setIncident({ ...incident, description: e.target.value })}
              />
            </Field>

            <Field label={t("internal.impact")}>
              <Textarea
                rows={2}
                value={incident.impact}
                onChange={(e) => setIncident({ ...incident, impact: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("internal.reportedBy")}>
                <Input
                  value={incident.reportedBy}
                  onChange={(e) => setIncident({ ...incident, reportedBy: e.target.value })}
                />
              </Field>
              <Field label={t("internal.contact")}>
                <Input
                  value={incident.contact}
                  onChange={(e) => setIncident({ ...incident, contact: e.target.value })}
                />
              </Field>
            </div>
          </>
        )}

        {formError && (
          <p className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-[13px] text-danger">
            {formError}
          </p>
        )}

        <Button onClick={() => void submit()} size="lg" disabled={submitting}>
          {submitting ? t("internal.submitting") : t("internal.submit")}
        </Button>
      </div>
    </Card>
  );
}

function StatusCard({ title, body, tone }: { title: string; body: string; tone: "ok" | "warn" }) {
  return (
    <Card className="p-8 text-center sm:p-12">
      <div
        className={`mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full ${
          tone === "ok" ? "bg-success/10" : "bg-amber-100"
        }`}
      >
        <span className={tone === "ok" ? "text-success" : "text-amber-600"}>
          {tone === "ok" ? "✓" : "!"}
        </span>
      </div>
      <h1 className="font-display text-xl font-semibold text-navy-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">{body}</p>
    </Card>
  );
}

export { StatusCard };
