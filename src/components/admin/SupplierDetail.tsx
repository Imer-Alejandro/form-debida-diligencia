"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDict, useI18n } from "@/lib/i18n";
import type {
  DocumentRow,
  Evaluation,
  RegistrationRow,
  RegistrationStatus,
  RiskLevel,
  SupplierData,
} from "@/lib/types";
import { emptyEvaluation } from "@/lib/types";
import { formatBytes, formatDate } from "@/lib/utils";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { statusTone, riskTone } from "./tones";

const CHECK_IDS = [
  "rnc",
  "mercantil",
  "dgii",
  "tss",
  "bank",
  "shareholder",
  "pep",
  "references",
  "permits",
  "conflicts",
];

const CHECK_RESULTS = [
  "CONFORME",
  "NO_CONFORME",
  "FAVORABLE",
  "NO_FAVORABLE",
  "ALERTA",
  "NO_IDENTIFICADO",
  "DECLARADO",
  "ESCALADO",
  "N/A",
];

const REVIEW_TYPES = ["INICIAL", "ACTUALIZACION", "EVENTO", "CAMBIO_BANCARIO"];

export function SupplierDetail({
  reg,
  docs,
}: {
  reg: RegistrationRow;
  docs: DocumentRow[];
}) {
  const { t } = useI18n();
  const router = useRouter();

  const [evaluation, setEvaluation] = useState<Evaluation>(
    reg.evaluation ?? emptyEvaluation()
  );
  const [tags, setTags] = useState<string[]>(reg.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState<"eval" | "tags" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqLink, setReqLink] = useState<string | null>(null);

  const flashRef = useRef<number | null>(null);
  const notify = (msg: string, reset?: () => void) => {
    if (flashRef.current) window.clearTimeout(flashRef.current);
    setFlash(msg);
    reset?.();
    flashRef.current = window.setTimeout(() => {
      setFlash(null);
      router.refresh();
    }, 2200);
  };

  const patchEval = (fn: (e: Evaluation) => Evaluation) =>
    setEvaluation((prev) => fn(prev));

  const saveEvaluation = async () => {
    setSaving("eval");
    const res = await fetch("/api/admin/evaluation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reg.id, evaluation }),
    });
    setSaving(null);
    if (res.ok) notify(t("admin.detail.savedEvaluation"));
  };

  const saveTags = async () => {
    setSaving("tags");
    const res = await fetch("/api/admin/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reg.id, tags }),
    });
    setSaving(null);
    if (res.ok) notify("Etiquetas guardadas");
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (!v || tags.includes(v)) return;
    setTags([...tags, v]);
    setTagInput("");
  };

  const requestChanges = async () => {
    setReqLoading(true);
    const res = await fetch("/api/admin/request-changes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reg.id }),
    });
    const data = (await res.json()) as { ok?: boolean; url?: string };
    setReqLoading(false);
    if (res.ok && data.url) {
      setReqLink(data.url);
      notify(t("admin.detail.savedEvaluation"), () => router.refresh());
    }
  };

  const data = reg.data as SupplierData;
  const csv = (s: string) => s.trim() || "—";

  return (
    <div>
      <Link
        href="/admin/suppliers"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 transition-colors mb-3"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>{t("admin.detail.back")}</span>
      </Link>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {data.section1.legalName || data.section1.commercialName || "—"}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-700">{reg.reference_no}</span>
              <span>{csv(data.section1.taxId)}</span>
              <span>{csv(data.section1.provinceCountry)}</span>
              <span>{formatDate(reg.submitted_at ?? reg.created_at)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={riskTone(reg.risk_level)} withDot>{t(`risk.${reg.risk_level}` as never)}</Badge>
            <Badge tone={statusTone(reg.status)} withDot>{t(`statuses.${reg.status}` as never)}</Badge>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t("admin.detail.tagsTitle")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {tag}
                <button
                  onClick={() => setTags(tags.filter((x) => x !== tag))}
                  className="text-slate-400 hover:text-rose-600 transition-colors"
                  aria-label="Quitar"
                >
                  ×
                </button>
              </span>
            ))}
            <div className="flex items-center gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder={t("admin.detail.tagPlaceholder")}
                className="h-9 w-44 text-[13px]"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  addTag();
                }}
                disabled={!tagInput.trim()}
                type="button"
              >
                {t("admin.detail.addTag")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void saveTags()} disabled={saving === "tags"} type="button">
                {saving === "tags" ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {flash && (
        <div className="mt-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-[13px] font-medium text-success">
          {flash}
        </div>
      )}

      <div className="mt-5 space-y-5 lg:grid lg:grid-cols-5 lg:gap-5 lg:space-y-0">
        {/* Supplier data */}
        <section className="rounded-2xl border border-navy-800/10 bg-white p-5 lg:col-span-3">
          <DataView data={data} />
        </section>

        {/* Documents */}
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl border border-navy-800/10 bg-white p-5">
            <h2 className="font-display text-[15px] font-semibold text-navy-900">
              {t("admin.detail.documents")}
            </h2>
            <ul className="mt-3 space-y-2">
              {docs.length === 0 && (
                <p className="text-[13px] text-ink-muted">{t("admin.detail.noDocuments")}</p>
              )}
              {docs.map((doc) => (
                <li key={doc.id}>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-3 rounded-xl border border-navy-800/10 px-3 py-2.5 transition-colors hover:bg-bone-50"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy-800 text-[11px] font-bold text-white">
                      {doc.ref}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{doc.file_name}</p>
                      <p className="text-[11.5px] text-ink-muted">
                        {formatBytes(doc.file_size)} · {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-navy-800/10 bg-white p-5">
            <h2 className="font-display text-[15px] font-semibold text-navy-900">
              {t("admin.detail.evaluationTitle")}
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-muted">{t("admin.detail.section12")}</p>

            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("admin.detail.requestingCompany")}>
                  <Input
                    value={evaluation.section12.requestingCompany}
                    onChange={(e) => patchEval((ev) => ({ ...ev, section12: { ...ev.section12, requestingCompany: e.target.value } }))}
                  />
                </Field>
                <Field label={t("admin.detail.requestingArea")}>
                  <Input
                    value={evaluation.section12.requestingArea}
                    onChange={(e) => patchEval((ev) => ({ ...ev, section12: { ...ev.section12, requestingArea: e.target.value } }))}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("admin.detail.purchaseCategory")}>
                  <Input
                    value={evaluation.section12.purchaseCategory}
                    onChange={(e) => patchEval((ev) => ({ ...ev, section12: { ...ev.section12, purchaseCategory: e.target.value } }))}
                  />
                </Field>
                <Field label={t("admin.detail.estimatedAnnualAmount")}>
                  <Input
                    value={evaluation.section12.estimatedAnnualAmount}
                    onChange={(e) => patchEval((ev) => ({ ...ev, section12: { ...ev.section12, estimatedAnnualAmount: e.target.value } }))}
                  />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("admin.detail.classification")}>
                  <Select
                    value={evaluation.section12.risk}
                    onChange={(e) => patchEval((ev) => ({ ...ev, section12: { ...ev.section12, risk: e.target.value as RiskLevel } }))}
                  >
                    {(["PENDIENTE", "BAJO", "MEDIO", "ALTO", "CRITICO"] as RiskLevel[]).map((r) => (
                      <option key={r} value={r}>
                        {t(`risk.${r}` as never)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("admin.detail.reviewType")}>
                  <Select
                    value={evaluation.section12.reviewType}
                    onChange={(e) => patchEval((ev) => ({ ...ev, section12: { ...ev.section12, reviewType: e.target.value } }))}
                  >
                    {REVIEW_TYPES.map((rt) => (
                      <option key={rt} value={rt}>
                        {t(`admin.detail.reviewTypes.${rt}` as never)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="overflow-x-auto rounded-xl border border-navy-800/10">
                <table className="w-full min-w-[560px] text-[13px]">
                  <thead>
                    <tr className="text-left text-[11.5px] uppercase tracking-wide text-ink-muted">
                      <th className="px-3 py-2">Verificación</th>
                      <th className="px-3 py-2">Resultado</th>
                      <th className="px-3 py-2 w-28">Fecha</th>
                      <th className="px-3 py-2">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CHECK_IDS.map((cid) => {
                      const row = evaluation.section12.checks.find((c) => c.id === cid);
                      return (
                        <tr key={cid} className="border-t border-navy-800/5">
                          <td className="px-3 py-2 text-ink">{t(`admin.detail.checkTable.${cid}` as never)}</td>
                          <td className="px-3 py-2">
                            <Select
                              className="h-9 w-44 text-[12.5px]"
                              value={row?.result ?? "N/A"}
                              onChange={(e) =>
                                patchEval((ev) => ({
                                  ...ev,
                                  section12: {
                                    ...ev.section12,
                                    checks: ev.section12.checks.map((c) =>
                                      c.id === cid ? { ...c, result: e.target.value } : c
                                    ),
                                  },
                                }))
                              }
                            >
                              {CHECK_RESULTS.map((cr) => (
                                <option key={cr} value={cr}>
                                  {t(`admin.detail.checkResults.${cr}` as never)}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="date"
                              className="h-9 text-[12.5px]"
                              value={row?.date ?? ""}
                              onChange={(e) =>
                                patchEval((ev) => ({
                                  ...ev,
                                  section12: {
                                    ...ev.section12,
                                    checks: ev.section12.checks.map((c) =>
                                      c.id === cid ? { ...c, date: e.target.value } : c
                                    ),
                                  },
                                }))
                              }
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              className="h-9 text-[12.5px]"
                              value={row?.notes ?? ""}
                              onChange={(e) =>
                                patchEval((ev) => ({
                                  ...ev,
                                  section12: {
                                    ...ev.section12,
                                    checks: ev.section12.checks.map((c) =>
                                      c.id === cid ? { ...c, notes: e.target.value } : c
                                    ),
                                  },
                                }))
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <h3 className="mt-6 font-display text-[14px] font-semibold text-navy-900">{t("admin.detail.section13")}</h3>
            <div className="mt-3 space-y-4">
              <Field label={t("admin.detail.decision")}>
                <Select
                  value={evaluation.section13.decision}
                  onChange={(e) => patchEval((ev) => ({ ...ev, section13: { ...ev.section13, decision: e.target.value as RegistrationStatus } }))}
                >
                  {(["APROBADO", "APROBADO_CONDICIONES", "RECHAZADO", "PENDIENTE", "EN_REVISION"] as RegistrationStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {t(`admin.detail.decisions.${st}` as never)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("admin.detail.conditions")}>
                <Textarea
                  rows={3}
                  value={evaluation.section13.conditions}
                  onChange={(e) => patchEval((ev) => ({ ...ev, section13: { ...ev.section13, conditions: e.target.value } }))}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("admin.detail.purchaseLimits")}>
                  <Input
                    value={evaluation.section13.purchaseLimits}
                    onChange={(e) => patchEval((ev) => ({ ...ev, section13: { ...ev.section13, purchaseLimits: e.target.value } }))}
                  />
                </Field>
                <Field label={t("admin.detail.nextRenewal")}>
                  <Input
                    type="date"
                    value={evaluation.section13.nextRenewal}
                    onChange={(e) => patchEval((ev) => ({ ...ev, section13: { ...ev.section13, nextRenewal: e.target.value } }))}
                  />
                </Field>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-medium text-ink">{t("admin.detail.reviewersTitle")}</p>
                <div className="space-y-2">
                  {evaluation.section13.signatures.map((sig, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Select
                        className="h-10 w-52 text-[12.5px]"
                        value={sig.role}
                        onChange={(e) =>
                          patchEval((ev) => ({
                            ...ev,
                            section13: {
                              ...ev.section13,
                              signatures: ev.section13.signatures.map((s, j) => (j === i ? { ...s, role: e.target.value } : s)),
                            },
                          }))
                        }
                      >
                        <option value="ANALISTA">{t("admin.detail.reviewerRoles.ANALISTA" as never)}</option>
                        <option value="GERENCIA">{t("admin.detail.reviewerRoles.GERENCIA" as never)}</option>
                        <option value="FINANZAS">{t("admin.detail.reviewerRoles.FINANZAS" as never)}</option>
                        <option value="CUMPLIMIENTO">{t("admin.detail.reviewerRoles.CUMPLIMIENTO" as never)}</option>
                      </Select>
                      <Input
                        className="h-10 w-44 text-[12.5px]"
                        value={sig.name}
                        placeholder="Nombre"
                        onChange={(e) =>
                          patchEval((ev) => ({
                            ...ev,
                            section13: {
                              ...ev.section13,
                              signatures: ev.section13.signatures.map((s, j) => (j === i ? { ...s, name: e.target.value } : s)),
                            },
                          }))
                        }
                      />
                      <Input
                        type="date"
                        className="h-10 w-40 text-[12.5px]"
                        value={sig.date ?? ""}
                        onChange={(e) =>
                          patchEval((ev) => ({
                            ...ev,
                            section13: {
                              ...ev.section13,
                              signatures: ev.section13.signatures.map((s, j) => (j === i ? { ...s, date: e.target.value } : s)),
                            },
                          }))
                        }
                      />
                      <button
                        onClick={() =>
                          patchEval((ev) => ({
                            ...ev,
                            section13: {
                              ...ev.section13,
                              signatures: ev.section13.signatures.filter((_, j) => j !== i),
                            },
                          }))
                        }
                        className="text-[12px] text-ink-muted hover:text-danger"
                      >
                        {t("common.remove")}
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      patchEval((ev) => ({
                        ...ev,
                        section13: {
                          ...ev.section13,
                          signatures: [...ev.section13.signatures, { role: "ANALISTA", name: "", date: "" }],
                        },
                      }))
                    }
                  >
                    + {t("common.add")}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-navy-800/10 pt-4">
                <Button type="button" onClick={() => void saveEvaluation()} disabled={saving === "eval"}>
                  {saving === "eval" ? t("common.saving") : t("admin.detail.saveEvaluation")}
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-navy-800/10 bg-white p-5">
            <h2 className="font-display text-[15px] font-semibold text-navy-900">
              {t("admin.detail.requestChanges")}
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
              {t("admin.detail.requestChangesNote")}
            </p>
            <Button
              type="button"
              variant="danger"
              className="mt-3"
              onClick={() => void requestChanges()}
              disabled={reqLoading}
            >
              {reqLoading ? t("common.loading") : t("admin.detail.requestChanges")}
            </Button>
            {reqLink && (
              <div className="mt-3 rounded-xl bg-bone-100 px-4 py-3">
                <a href={reqLink} target="_blank" rel="noreferrer" className="text-[13px] text-navy-700 underline underline-offset-2">
                  {reqLink}
                </a>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function FieldValue({ label, value }: { label: string; value: string }) {
  return value ? (
    <div className="min-w-0">
      <p className="truncate text-[12px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-0.5 text-[13.5px] text-ink">{value}</p>
    </div>
  ) : null;
}

function DataView({ data }: { data: SupplierData }) {
  const { t } = useI18n();
  const d = useDict();
  const s1 = data.section1;
  const s3 = data.section3;
  const s4 = data.section4;
  const s5 = data.section5;
  const s6 = data.section6;

  const yn = (v: string) => (v === "si" ? t("common.yes") : v === "no" ? t("common.no") : "—");
  const mapOr = (v: string, m?: Record<string, string>) =>
    m && m[v] ? m[v] : v || "—";

  return (
    <div>
      <h2 className="font-display text-[15px] font-semibold text-navy-900">
        {d.s1.title}
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2">
        <FieldValue label={d.s1.providerType} value={mapOr(s1.providerType, (d as never as { s1: { pTypes: Record<string, string> } }).s1.pTypes)} />
        <FieldValue label={d.s1.legalName} value={s1.legalName} />
        <FieldValue label={d.s1.commercialName} value={s1.commercialName} />
        <FieldValue label={d.s1.taxId} value={s1.taxId} />
        <FieldValue label={d.s1.registryNo} value={s1.registryNo} />
        <FieldValue label={d.s1.registryExpiry} value={s1.registryExpiry} />
        <FieldValue label={d.s1.foundedDate} value={s1.foundedDate} />
        <FieldValue label={d.s1.legalAddress} value={s1.legalAddress} />
        <FieldValue label={d.s1.provinceCountry} value={s1.provinceCountry} />
        <FieldValue label={d.s1.phoneEmail} value={s1.phoneEmail} />
        <FieldValue label={d.s1.website} value={s1.website} />
        <FieldValue label={d.s1.mainEconomicActivity} value={s1.mainEconomicActivity} />
        <FieldValue label={d.s1.goodsServices} value={s1.goodsServices} />
      </div>

      <h3 className="mt-7 border-t border-navy-800/10 pt-5 font-display text-[15px] font-semibold text-navy-900">
        {d.s2.title}
      </h3>
      <div className="mt-3 space-y-2.5">
        {data.section2.contacts.length === 0 && <p className="text-[13px] text-ink-muted">—</p>}
        {data.section2.contacts.map((c, i) => (
          <div key={i} className="rounded-xl border border-navy-800/10 px-4 py-3">
            <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
              <FieldValue label={d.s2.role} value={mapOr(c.role, (d as never as { s2: { roles: Record<string, string> } }).s2.roles)} />
              <FieldValue label={d.s2.name} value={c.name} />
              <FieldValue label={d.s2.phone} value={c.phone} />
              <FieldValue label={d.s2.email} value={c.email} />
            </div>
          </div>
        ))}
      </div>

      <h3 className="mt-7 border-t border-navy-800/10 pt-5 font-display text-[15px] font-semibold text-navy-900">
        {d.s3.title}
      </h3>
      <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2">
        <FieldValue label={d.s3.legalRepName} value={s3.legalRepName} />
        <FieldValue label={d.s3.legalRepId} value={s3.legalRepId} />
        <FieldValue label={d.s3.shareholders} value={s3.shareholders} />
        <FieldValue label={d.s3.pep} value={yn(s3.pep)} />
        <FieldValue label={d.s3.pepDetail} value={s3.pepDetail} />
        <FieldValue label={d.s3.relatedToSbc} value={yn(s3.relatedToSbc)} />
        <FieldValue label={d.s3.relatedToSbcDetail} value={s3.relatedToSbcDetail} />
        <FieldValue label={d.s3.relatedCompanies} value={s3.relatedCompanies} />
      </div>

      <h3 className="mt-7 border-t border-navy-800/10 pt-5 font-display text-[15px] font-semibold text-navy-900">
        {d.s4.title}
      </h3>
      <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2">
        <FieldValue
          label={d.s4.taxReceipts}
          value={s4.taxReceipts
            .map((k) => (k === "ncf" ? d.s4.t1 : k === "ecf" ? d.s4.t2 : k === "na" ? d.s4.t3 : k))
            .join(" · ")}
        />
        <FieldValue label={d.s4.taxCondition} value={mapOr(s4.taxCondition, d.s4.taxConditions)} />
        <FieldValue label={d.s4.tss} value={s4.tss.map((k) => mapOr(k, d.s4.tssOptions)).join(" · ")} />
        <FieldValue label={d.s4.withholdings} value={s4.withholdings} />
        <FieldValue label={d.s4.specialRegime} value={s4.specialRegime.map((k) => mapOr(k, d.s4.specialRegimeOptions)).join(" · ")} />
        <FieldValue label={d.s4.specialRegimeOther} value={s4.specialRegimeOther} />
      </div>

      <h3 className="mt-7 border-t border-navy-800/10 pt-5 font-display text-[15px] font-semibold text-navy-900">
        {d.s5.title}
      </h3>
      <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2">
        <FieldValue label={d.s5.bank} value={s5.bank} />
        <FieldValue label={d.s5.accountHolder} value={s5.accountHolder} />
        <FieldValue label={d.s5.accountHolderId} value={s5.accountHolderId} />
        <FieldValue label={d.s5.accountType} value={s5.accountType.map((k) => mapOr(k, d.s5.accountTypes)).join(" · ")} />
        <FieldValue label={d.s5.currency} value={mapOr(s5.currency, d.s5.currencies)} />
        <FieldValue label={d.s5.currencyOther} value={s5.currencyOther} />
        <FieldValue label={d.s5.accountNumber} value={s5.accountNumber} />
        <FieldValue label={d.s5.swift} value={s5.swift} />
        <FieldValue label={d.s5.paymentTerms} value={s5.paymentTerms.map((k) => mapOr(k, d.s5.paymentTermsOptions)).join(" · ")} />
        <FieldValue label={d.s5.creditDays} value={s5.creditDays} />
        <FieldValue label={d.s5.advancePct} value={s5.advancePct} />
      </div>

      <h3 className="mt-7 border-t border-navy-800/10 pt-5 font-display text-[15px] font-semibold text-navy-900">
        {d.s6.title}
      </h3>
      <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2">
        <FieldValue label={d.s6.yearsExperience} value={s6.yearsExperience} />
        <FieldValue label={d.s6.coverage} value={s6.coverage.map((k) => mapOr(k, d.s6.coverageOptions)).join(" · ")} />
        <FieldValue label={d.s6.coverageDetail} value={s6.coverageDetail} />
        <FieldValue label={d.s6.supplyCapacity} value={s6.supplyCapacity} />
        <FieldValue label={d.s6.avgDeliveryTime} value={s6.avgDeliveryTime} />
        <FieldValue label={d.s6.warrantyPolicy} value={s6.warrantyPolicy} />
        <FieldValue label={d.s6.brands} value={s6.brands} />
      </div>

      <h3 className="mt-7 border-t border-navy-800/10 pt-5 font-display text-[15px] font-semibold text-navy-900">
        {d.s7.title}
      </h3>
      <div className="mt-3 space-y-2.5">
        {data.section7.references.length === 0 && <p className="text-[13px] text-ink-muted">—</p>}
        {data.section7.references.map((r, i) => (
          <div key={i} className="grid grid-cols-1 gap-x-4 gap-y-1.5 rounded-xl border border-navy-800/10 px-4 py-3 sm:grid-cols-2">
            <FieldValue label={d.s7.client} value={r.client} />
            <FieldValue label={d.s7.contact} value={r.contact} />
            <FieldValue label={d.s7.phoneEmail} value={r.phoneEmail} />
            <FieldValue label={d.s7.product} value={r.product} />
          </div>
        ))}
      </div>

      <h3 className="mt-7 border-t border-navy-800/10 pt-5 font-display text-[15px] font-semibold text-navy-900">
        {d.s8.title}
      </h3>
      <div className="mt-3 space-y-2">
        {data.section8.compliance.map((c, i) => (
          <div key={c.id} className="rounded-xl border border-navy-800/10 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13px] leading-relaxed text-ink">{d.s8.questions[i] ?? c.id}</p>
              <Badge tone={c.answer === "si" ? "amber" : c.answer === "no" ? "green" : "gray"}>
                {yn(c.answer)}
              </Badge>
            </div>
            {c.explanation && (
              <p className="mt-1.5 text-[12.5px] text-ink-muted">{c.explanation}</p>
            )}
          </div>
        ))}
      </div>

      <h3 className="mt-7 border-t border-navy-800/10 pt-5 font-display text-[15px] font-semibold text-navy-900">
        {d.s9.title}
      </h3>
      <div className="mt-3 space-y-1.5">
        {data.section9.documents.filter((x) => x.checked).map((doc) => (
          <div key={doc.ref} className="flex items-start gap-3 rounded-xl border border-navy-800/10 px-4 py-2.5">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-navy-800 text-[10.5px] font-bold text-white">
              {doc.ref}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-snug text-ink">
                {d.s9.docDescriptions[doc.ref as keyof typeof d.s9.docDescriptions] ?? doc.ref}
              </p>
              {doc.note && <p className="text-[12px] text-ink-muted">{doc.note}</p>}
            </div>
          </div>
        ))}
        {data.section9.documents.filter((x) => x.checked).length === 0 && (
          <p className="text-[13px] text-ink-muted">—</p>
        )}
      </div>

      <h3 className="mt-7 border-t border-navy-800/10 pt-5 font-display text-[15px] font-semibold text-navy-900">
        {d.s10.title}
      </h3>
      <div className="mt-3 space-y-2">
        {data.section10.authorizations.length === 0 && (
          <p className="text-[13px] text-ink-muted">—</p>
        )}
        {data.section10.authorizations.map((a, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-xl border border-navy-800/10 px-4 py-2.5 text-[13px] text-ink">
            <span className="mt-0.5 text-success">✓</span>
            <span className="leading-relaxed">{d.s10.authorizations[Number(a)] ?? a}</span>
          </div>
        ))}
      </div>

      <h3 className="mt-7 border-t border-navy-800/10 pt-5 font-display text-[15px] font-semibold text-navy-900">
        {d.s11.title}
      </h3>
      <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2">
        <FieldValue label={d.s11.signerName} value={data.section11.signerName} />
        <FieldValue label={d.s11.signerRole} value={data.section11.signerRole} />
        <FieldValue label={d.s11.signDate} value={data.section11.signedDate} />
        <FieldValue label={d.s11.signature} value={data.section11.signatureConsent ? t("common.yes") : t("common.no")} />
      </div>
      {data.section11.signatureDataUrl && (
        <div className="mt-4 inline-block overflow-hidden rounded-xl border border-navy-800/10 bg-bone-50 px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.section11.signatureDataUrl}
            alt="Firma del proveedor"
            className="h-24 object-contain"
          />
        </div>
      )}
    </div>
  );
}