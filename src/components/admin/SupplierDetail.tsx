"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDict, useI18n } from "@/lib/i18n";
import {
  documentCatalog,
  type DocumentRow,
  type Evaluation,
  type RegistrationRow,
  type RegistrationStatus,
  type RiskLevel,
  type SupplierData,
} from "@/lib/types";
import { emptyEvaluation } from "@/lib/types";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { countryName } from "@/lib/countries";
import { Badge, Button, Field, Input, Select, Textarea, type BadgeTone } from "@/components/ui";
import { CHECK_RESULT_TONES, statusTone, riskTone } from "./tones";

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

const DECISION_OPTIONS: RegistrationStatus[] = [
  "APROBADO",
  "APROBADO_CONDICIONES",
  "EN_REVISION",
  "PENDIENTE",
  "RECHAZADO",
];

const INACTIVE_BUTTON =
  "border-navy-800/10 bg-white text-ink-muted hover:border-navy-800/30 hover:text-ink";

const ACTIVE_BUTTON_TONES: Record<BadgeTone, string> = {
  navy: "border-navy-700/40 bg-navy-800/5 text-navy-900 ring-1 ring-navy-700/10",
  gold: "border-amber-600/50 bg-amber-50 text-amber-900 ring-1 ring-amber-600/20",
  green: "border-emerald-500/50 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/20",
  amber: "border-amber-500/40 bg-amber-50 text-amber-800 ring-1 ring-amber-500/20",
  red: "border-rose-500/50 bg-rose-50 text-rose-700 ring-1 ring-rose-500/20",
  gray: "border-slate-400/50 bg-slate-100 text-slate-700 ring-1 ring-slate-400/20",
  bone: "border-slate-300/70 bg-slate-100 text-slate-700 ring-1 ring-slate-300/40",
  blue: "border-sky-500/50 bg-sky-50 text-sky-700 ring-1 ring-sky-500/20",
  teal: "border-teal-500/50 bg-teal-50 text-teal-800 ring-1 ring-teal-500/20",
};

const TONE_DOT: Record<BadgeTone, string> = {
  navy: "bg-navy-700",
  gold: "bg-amber-600",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  gray: "bg-slate-400",
  bone: "bg-slate-400",
  blue: "bg-sky-500",
  teal: "bg-teal-600",
};

/** Card skin for each verification-check result tone (keeps the list colorful). */
const CHECK_CARD_STYLES: Record<BadgeTone, { wrap: string; chip: string }> = {
  green: { wrap: "border-emerald-200/80 bg-emerald-50/50", chip: "bg-emerald-600 text-white" },
  teal: { wrap: "border-teal-200/80 bg-teal-50/50", chip: "bg-teal-600 text-white" },
  amber: { wrap: "border-amber-200/80 bg-amber-50/60", chip: "bg-amber-500 text-white" },
  red: { wrap: "border-rose-200/80 bg-rose-50/50", chip: "bg-rose-500 text-white" },
  blue: { wrap: "border-sky-200/80 bg-sky-50/50", chip: "bg-sky-500 text-white" },
  gold: { wrap: "border-amber-300/70 bg-amber-50/70", chip: "bg-amber-600 text-white" },
  gray: { wrap: "border-navy-800/10 bg-bone-50/60", chip: "bg-navy-800/10 text-navy-800" },
  navy: { wrap: "border-navy-700/20 bg-navy-800/5", chip: "bg-navy-800 text-white" },
  bone: { wrap: "border-navy-800/10 bg-bone-50/60", chip: "bg-navy-800/10 text-navy-800" },
};

/** Default skin while a check has not been answered yet. */
const UNEVALUATED_CARD = { wrap: "border-navy-800/10 bg-white", chip: "bg-navy-800/5 text-navy-800" };

function checkResultKey(k: string): string {
  return k === "N/A" ? "NA" : k;
}

export function SupplierDetail({
  reg,
  docs,
}: {
  reg: RegistrationRow;
  docs: DocumentRow[];
}) {
  const { t } = useI18n();
  const dict = useDict();
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
  const [reqNote, setReqNote] = useState("");
  const [showReq, setShowReq] = useState(false);
  const [reqMail, setReqMail] = useState<"sent" | "failed" | "skipped" | null>(null);

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
      body: JSON.stringify({ id: reg.id, note: reqNote }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      url?: string;
      emailStatus?: "sent" | "failed" | "skipped";
    };
    setReqLoading(false);
    if (!res.ok || !data.url) return;
    setReqLink(data.url);
    const mail = data.emailStatus ?? "skipped";
    setReqMail(mail);
    setShowReq(false);
    notify(
      mail === "sent"
        ? t("admin.detail.requestMailSent")
        : mail === "failed"
          ? t("admin.detail.requestMailFailed")
          : t("admin.detail.requestMailSkipped")
    );
  };

  const data = reg.data as SupplierData;
  const csv = (s: string) => s.trim() || "—";

  const checkedByRef: Record<string, { note?: string }> = {};
  for (const d of data.section9?.documents ?? []) {
    if (d.checked) checkedByRef[d.ref] = { note: d.note };
  }
  const docRefs = Object.keys(checkedByRef);
  const pendingDocs = docRefs.filter((ref) => !docs.some((d) => d.ref === ref));
  const signatureDoc = docs.find((d) => d.ref === "FIRMA");

  const resultCounts: Partial<Record<string, number>> = {};
  for (const c of evaluation.section12.checks) {
    resultCounts[c.result] = (resultCounts[c.result] ?? 0) + 1;
  }

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
            <Link
              href={`/admin/suppliers/${reg.id}/docs`}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-800/15 bg-white px-3 py-2 text-xs font-semibold text-navy-800 transition-colors hover:bg-bone-50"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
              </svg>
              {t("admin.detail.viewerTitle")} ({docs.length})
            </Link>
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
          <DataView data={data} regId={reg.id} signatureDoc={signatureDoc} />
        </section>

        {/* Documents */}
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl border border-navy-800/10 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-[15px] font-semibold text-navy-900">
                {t("admin.detail.documents")}
              </h2>
              {docs.length > 0 && (
                <Link
                  href={`/admin/suppliers/${reg.id}/docs`}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-navy-700 underline decoration-navy-700/30 underline-offset-2 transition-colors hover:decoration-navy-700"
                >
                  {t("admin.detail.openViewer")} →
                </Link>
              )}
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-navy-800/10 bg-bone-50 px-2.5 py-1 font-medium text-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {t("docs.attachedCount", { n: String(docs.length) })}
                </span>
                {pendingDocs.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/5 px-2.5 py-1 font-medium text-warning">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                    {t("docs.pendingCount", { n: String(pendingDocs.length) })}
                  </span>
                )}
              </div>

            {docRefs.length === 0 && (
              <p className="mt-3 text-[13px] text-ink-muted">{t("admin.detail.noDocuments")}</p>
            )}

            <ul className="mt-3 space-y-2.5">
              {docRefs.map((ref) => {
                const meta = documentCatalog.find((d) => d.ref === ref);
                const note = checkedByRef[ref as keyof typeof checkedByRef]?.note ?? "";
                const files = docs.filter((d) => d.ref === ref);
                const pending = files.length === 0;
                return (
                  <li
                    key={ref}
                    className={cn(
                      "rounded-xl border px-3 py-3 transition-colors",
                      pending ? "border-dashed border-warning/40 bg-warning/5" : "border-navy-800/10 bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span className="grid h-7 w-8 shrink-0 place-items-center rounded-lg bg-navy-800 text-[11px] font-bold text-white">
                          {ref}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] leading-snug text-ink">
                            {dict.s9.docDescriptions[ref as keyof typeof dict.s9.docDescriptions] ?? meta?.appliesTo ?? ref}
                          </p>
                          {note && <p className="mt-0.5 text-[11.5px] text-ink-muted">{note}</p>}
                        </div>
                      </div>
                      <Badge tone={pending ? "amber" : "green"}>
                        {pending ? t("docs.pending") : t("docs.uploaded")}
                      </Badge>
                    </div>

                    {files.length > 0 && (
                      <ul className="mt-2.5 space-y-1.5">
                        {files.map((doc) => (
                          <li key={doc.id}>
                            <div className="flex items-center gap-1 rounded-lg border border-navy-800/10 px-2.5 py-2 transition-colors hover:bg-bone-50">
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex min-w-0 flex-1 items-center gap-2.5"
                              >
                                <span className="grid h-6 w-9 shrink-0 place-items-center rounded-md bg-navy-50 text-[9.5px] font-bold uppercase tracking-wide text-navy-700">
                                  {fileExt(doc.file_name)}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[12.5px] font-medium text-ink">
                                    {doc.file_name}
                                  </span>
                                  <span className="text-[11px] text-ink-muted">
                                    {formatBytes(doc.file_size)} · {formatDate(doc.created_at)}
                                  </span>
                                </span>
                              </a>
                              <a
                                href={`/api/admin/doc/${reg.id}/${doc.id}?dl=1`}
                                title={t("admin.detail.download")}
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-navy-800/5 hover:text-navy-800"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                              </a>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="overflow-hidden rounded-2xl border border-navy-800/10 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-800/10 bg-bone-50/70 px-5 py-4">
              <div className="min-w-0">
                <h2 className="font-display text-[15px] font-semibold text-navy-900">
                  {t("admin.detail.evaluationTitle")}
                </h2>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  {t("admin.detail.section12")} · {t("admin.detail.section13")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={riskTone(evaluation.section12.risk || "PENDIENTE")} withDot>
                  {t(`risk.${evaluation.section12.risk || "PENDIENTE"}` as never)}
                </Badge>
                <Badge tone={statusTone(evaluation.section13.decision || "PENDIENTE")} withDot>
                  {t(`admin.detail.decisions.${evaluation.section13.decision || "PENDIENTE"}` as never)}
                </Badge>
              </div>
            </div>

            <div className="space-y-7 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-navy-800 font-mono text-[11px] font-bold text-white">
                    1
                  </span>
                  <h3 className="font-display text-[14px] font-semibold text-navy-900">
                    {t("admin.detail.section12")}
                  </h3>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

                <div className="mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-ink">
                      {t("admin.detail.verificationsTitle")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {CHECK_RESULTS.filter((r) => (resultCounts[r] ?? 0) > 0).map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1.5 rounded-full border border-navy-800/10 bg-white px-2 py-0.5 text-[11px] font-medium text-ink"
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[CHECK_RESULT_TONES[r] ?? "gray"])} />
                          <span className="tabular-nums">{resultCounts[r]}</span>
                          <span>·</span>
                          <span>{t(`admin.detail.checkResults.${checkResultKey(r)}` as never)}</span>
                        </span>
                      ))}
                      {CHECK_RESULTS.every((r) => (resultCounts[r] ?? 0) === 0) && (
                        <span className="text-[11px] text-ink-muted">{t("admin.detail.resultsSummary")}: —</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 space-y-2.5">
                    {CHECK_IDS.map((cid, idx) => {
                      const row = evaluation.section12.checks.find((c) => c.id === cid);
                      const result = row?.result ?? "";
                      const tone = CHECK_RESULT_TONES[result] ?? "gray";
                      const card = result ? CHECK_CARD_STYLES[tone] : UNEVALUATED_CARD;
                      const statusLabel = result
                        ? t(`admin.detail.checkResults.${checkResultKey(result)}` as never)
                        : t("admin.detail.checkNotEvaluated");
                      return (
                        <div key={cid} className={cn("rounded-xl border p-3.5 transition-colors", card.wrap)}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={cn(
                                  "grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-bold",
                                  card.chip
                                )}
                              >
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span
                                className="min-w-0 truncate text-[13px] font-semibold text-ink"
                                title={t(`admin.detail.checkTable.${cid}` as never)}
                              >
                                {t(`admin.detail.checkTable.${cid}` as never)}
                              </span>
                            </div>
                            <Badge tone={tone}>{statusLabel}</Badge>
                          </div>
                          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                            <div>
                              <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                                {t("admin.detail.resultLabel")}
                              </span>
                              <Select
                                className="h-9 w-full text-[12.5px]"
                                value={result}
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
                                <option value="">{t("admin.detail.checkNotEvaluated")}</option>
                                {CHECK_RESULTS.map((cr) => (
                                  <option key={cr} value={cr}>
                                    {t(`admin.detail.checkResults.${checkResultKey(cr)}` as never)}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div>
                              <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                                {t("admin.detail.dateLabel")}
                              </span>
                              <Input
                                type="date"
                                className="h-9 w-full text-[12.5px]"
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
                            </div>
                            <div className="sm:col-span-2">
                              <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                                {t("admin.detail.notes")}
                              </span>
                              <Input
                                className="h-9 w-full text-[12.5px]"
                                value={row?.notes ?? ""}
                                placeholder={t("admin.detail.notes")}
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
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-navy-800/10 pt-6">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-navy-800 font-mono text-[11px] font-bold text-white">
                    2
                  </span>
                  <h3 className="font-display text-[14px] font-semibold text-navy-900">
                    {t("admin.detail.section13")}
                  </h3>
                </div>

                <p className="mb-2 mt-4 text-[13px] font-medium text-ink">{t("admin.detail.decision")}</p>
                <div className="flex flex-wrap gap-2">
                  {DECISION_OPTIONS.map((st) => {
                    const active = evaluation.section13.decision === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          patchEval((ev) => ({ ...ev, section13: { ...ev.section13, decision: st } }))
                        }
                        className={cn(
                          "rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors",
                          active ? ACTIVE_BUTTON_TONES[statusTone(st)] : INACTIVE_BUTTON
                        )}
                      >
                        {t(`admin.detail.decisions.${st}` as never)}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label={t("admin.detail.conditions")} className="sm:col-span-2">
                    <Textarea
                      rows={3}
                      value={evaluation.section13.conditions}
                      onChange={(e) => patchEval((ev) => ({ ...ev, section13: { ...ev.section13, conditions: e.target.value } }))}
                    />
                  </Field>
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

                <div className="mt-5">
                  <p className="mb-2 text-[13px] font-medium text-ink">{t("admin.detail.reviewersTitle")}</p>
                  <div className="space-y-2">
                    {evaluation.section13.signatures.map((sig, i) => (
                      <div key={i} className="rounded-xl border border-navy-800/10 bg-bone-50/40 px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            className="h-10 flex-1 min-w-[160px] text-[12.5px]"
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
                            className="h-10 flex-1 min-w-[140px] text-[12.5px]"
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
                            className="ml-1 text-[12px] text-ink-muted hover:text-danger"
                          >
                            {t("common.remove")}
                          </button>
                        </div>
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

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-navy-800/10 pt-4">
                  <p className="text-[11.5px] text-ink-muted">
                    {saving === "eval" ? t("common.saving") : t("admin.detail.savedEvaluation")}
                  </p>
                  <Button type="button" onClick={() => void saveEvaluation()} disabled={saving === "eval"}>
                    {saving === "eval" ? t("common.saving") : t("admin.detail.saveEvaluation")}
                  </Button>
                </div>
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

            {showReq ? (
              <div className="mt-3 space-y-3">
                <div>
                  <span className="mb-1 block text-[12px] font-semibold text-ink">
                    {t("admin.detail.requestNoteLabel")}
                  </span>
                  <Textarea
                    rows={3}
                    value={reqNote}
                    onChange={(e) => setReqNote(e.target.value)}
                    placeholder={t("admin.detail.requestNoteHint")}
                    className="text-[13px]"
                  />
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {t("admin.detail.requestNoteHint")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => void requestChanges()}
                    disabled={reqLoading}
                  >
                    {reqLoading ? t("common.loading") : t("admin.detail.requestSend")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowReq(false);
                      setReqNote("");
                    }}
                    disabled={reqLoading}
                  >
                    {t("admin.detail.requestCancel")}
                  </Button>
                </div>
              </div>
            ) : (
              !reqLink && (
                <Button
                  type="button"
                  variant="danger"
                  className="mt-3"
                  onClick={() => setShowReq(true)}
                  disabled={reqLoading}
                >
                  {reqLoading ? t("common.loading") : t("admin.detail.requestChanges")}
                </Button>
              )
            )}

            {reqLink && (
              <div className="mt-3 rounded-xl border border-navy-800/10 bg-bone-100 px-4 py-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                  {t("admin.detail.changedLinkTitle")}
                </p>
                <a
                  href={reqLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block break-all text-[13px] text-navy-700 underline underline-offset-2"
                >
                  {reqLink}
                </a>
                {reqMail === "failed" && (
                  <p className="mt-1.5 text-[11.5px] font-medium text-rose-600">
                    {t("admin.detail.requestMailFailed")}
                  </p>
                )}
                {reqMail === "skipped" && reqMail !== null && (
                  <p className="mt-1.5 text-[11.5px] font-medium text-amber-700">
                    {t("admin.detail.requestMailSkipped")}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function fileExt(name?: string | null): string {
  if (!name) return "?";
  const i = name.lastIndexOf(".");
  if (i < 0 || i === name.length - 1) return "?";
  return name.slice(i + 1).slice(0, 5);
}

function FieldValue({ label, value }: { label: string; value: string }) {
  return value ? (
    <div className="min-w-0">
      <p className="truncate text-[12px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-0.5 text-[13.5px] text-ink">{value}</p>
    </div>
  ) : null;
}

function DataView({
  data,
  regId,
  signatureDoc,
}: {
  data: SupplierData;
  regId: string;
  signatureDoc?: DocumentRow;
}) {
  const { t, lang } = useI18n();
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
        <FieldValue
          label={d.s1.nationality}
          value={s1.nationality ? countryName(s1.nationality, lang) : ""}
        />
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
      {(data.section11.signatureDataUrl || signatureDoc) && (
        <div className="mt-4 inline-flex flex-col overflow-hidden rounded-xl border border-navy-800/10 bg-bone-50">
          <div className="px-5 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic admin proxy needs auth cookies, next/image can't fetch it */}
            <img
              src={
                signatureDoc
                  ? `/api/admin/doc/${regId}/${signatureDoc.id}`
                  : data.section11.signatureDataUrl
              }
              alt="Firma del proveedor"
              className="h-24 object-contain"
            />
          </div>
          {signatureDoc && (
            <Link
              href={`/admin/suppliers/${regId}/docs`}
              className="inline-flex items-center gap-2 border-t border-navy-800/10 bg-white px-3 py-2 text-[11.5px] font-medium text-navy-700 underline decoration-navy-700/30 underline-offset-2 transition-colors hover:decoration-navy-700"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
              {t("admin.detail.signatureStored")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}