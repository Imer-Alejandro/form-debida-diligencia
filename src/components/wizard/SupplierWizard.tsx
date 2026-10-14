"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { LangToggle } from "@/components/LangToggle";
import { useI18n } from "@/lib/i18n";
import {
  documentCatalog,
  emptyData,
  requiredDocumentRefs,
  type DocumentRow,
  type RegistrationRow,
  type SupplierData,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { SIGNATURE_REF } from "@/lib/upload-policy";
import {
  Section1,
  Section2,
  Section3,
  Section4,
  Section5,
  Section6,
  Section7,
  Section8,
  Section10,
  Section11,
} from "./sections";
import { SignaturePad } from "./SignaturePad";
import { DocumentsStep } from "./DocumentsStep";
import { ReviewStep } from "./ReviewStep";
import { uploadDocument } from "@/lib/upload-client";
import { EvaluationStatusCard } from "@/components/portal/EvaluationStatusCard";
import type { PortalStatusResult, SupplierStatus } from "@/components/portal/types";

const TITLE_STEPS = [
  "wizard.steps.0",
  "wizard.steps.1",
  "wizard.steps.2",
  "wizard.steps.3",
  "wizard.steps.4",
  "wizard.steps.5",
  "wizard.steps.6",
  "wizard.steps.7",
  "wizard.steps.8",
  "wizard.steps.9",
  "wizard.steps.10",
] as const;

const SUB_STEPS = [
  "wizard.stepSub.0",
  "wizard.stepSub.1",
  "wizard.stepSub.2",
  "wizard.stepSub.3",
  "wizard.stepSub.4",
  "wizard.stepSub.5",
  "wizard.stepSub.6",
  "wizard.stepSub.7",
  "wizard.stepSub.8",
  "wizard.stepSub.9",
  "wizard.stepSub.10",
] as const;

const TOTAL_STEPS = 11;

function normalizeContacts(initial: SupplierData | null): SupplierData["section2"] {
  const contacts = initial?.section2?.contacts;
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return emptyData().section2;
  }
  return {
    contacts: contacts.map((c) => ({
      role: c.role ?? "representante",
      name: c.name ?? "",
      position: c.position ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
    })),
  };
}

function initData(initial: SupplierData | null): SupplierData {
  const base = emptyData();
  if (initial) {
    const hasDocs = (initial.section9?.documents?.length ?? 0) > 0;
    return {
      ...base,
      ...initial,
      section1: { ...base.section1, ...initial.section1 },
      section2: normalizeContacts(initial),
      section3: { ...base.section3, ...initial.section3 },
      section4: { ...base.section4, ...initial.section4 },
      section5: { ...base.section5, ...initial.section5 },
      section6: { ...base.section6, ...initial.section6 },
      section7: { ...base.section7, ...initial.section7 },
      section8: { ...base.section8, ...initial.section8 },
      section9: {
        documents: hasDocs
          ? initial.section9.documents
          : documentCatalog.map((d) => ({ ref: d.ref, checked: false, note: "" })),
      },
      section10: { ...base.section10, ...initial.section10 },
      section11: { ...base.section11, ...initial.section11 },
    };
  }
  base.section9.documents = documentCatalog.map((d) => ({
    ref: d.ref,
    checked: false,
    note: "",
  }));
  return base;
}

export function SupplierWizard({
  token,
  initial,
  registration,
  lang,
}: {
  token: string;
  initial: SupplierData | null;
  registration: RegistrationRow | null;
  lang: "es" | "en";
}) {
  const { t, lang: currentLang, setLang } = useI18n();
  const [data, setDataState] = useState<SupplierData>(() => initData(initial));
  const [step, setStep] = useState(() => {
    const last = initial?._ui?.lastStep;
    if (typeof last === "number" && last >= 0 && last <= TOTAL_STEPS) {
      return Math.min(Math.floor(last), TOTAL_STEPS);
    }
    return 0;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [attached, setAttached] = useState<DocumentRow[]>([]);
  const [onedriveOn, setOnedriveOn] = useState(true);
  const [submission, setSubmission] = useState<
    { reference: string; status: string } | null
  >(
    registration &&
      !["BORRADOR", "SOLICITUD_CAMBIOS"].includes(registration.status)
      ? { reference: registration.reference_no ?? "", status: registration.status }
      : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const mountedRef = useRef(false);

  const editable = useMemo(
    () => !registration || ["BORRADOR", "SOLICITUD_CAMBIOS"].includes(registration.status),
    [registration]
  );

  const setData = useCallback((update: SupplierData | ((d: SupplierData) => SupplierData)) => {
    setDataState((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      if (JSON.stringify(next) !== JSON.stringify(prev)) dirtyRef.current = true;
      return next;
    });
  }, []);

  // Initial language from invitation and persisted preferences
  useEffect(() => {
    setLang(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load attached documents and OneDrive status once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (token) {
        const [docsRes, odRes] = await Promise.all([
          fetch(`/api/upload/list?token=${encodeURIComponent(token)}`),
          fetch("/api/onedrive/status"),
        ]);
        const docs = await docsRes.json().catch(() => null);
        const od = await odRes.json().catch(() => null);
        if (!cancelled) {
          if (Array.isArray(docs?.documents)) setAttached(docs.documents);
          setOnedriveOn(od?.configured === true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave draft (debounced).
  useEffect(() => {
    if (!editable) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!dirtyRef.current) return;
    const id = setTimeout(async () => {
      dirtyRef.current = false;
      setSaving(true);
      try {
        const res = await fetch("/api/registration/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, data, language: currentLang }),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.registration?.id) setSavedAt(Date.now());
      } catch {
        dirtyRef.current = true;
      } finally {
        setSaving(false);
      }
    }, 1200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, editable]);

  const validateStep = useCallback(
    (idx: number): Record<string, string> => {
      const errs: Record<string, string> = {};
      if (idx === 0) {
        if (!data.section1.providerType) errs["s1.providerType"] = t("validation.requiredField");
        if (!data.section1.legalName.trim()) errs["s1.legalName"] = t("validation.requiredField");
        if (!data.section1.taxId.trim()) errs["s1.taxId"] = t("validation.requiredField");
        if (data.section1.providerType === "juridica" && !data.section1.registryNo.trim()) {
          errs["s1.registryNo"] = t("validation.requiredField");
        }
        if (!data.section1.nationality) errs["s1.nationality"] = t("validation.requiredField");
      }
      if (idx === 8) {
        const required = requiredDocumentRefs({
          providerType: data.section1.providerType,
          nationality: data.section1.nationality,
          isContractor: data.section1.isContractor,
        });
        const missing = required.filter(
          (ref) => !data.section9.documents.find((d) => d.ref === ref)?.checked
        );
        if (missing.length > 0) {
          errs["s9"] = t("validation.documentsRequired", { refs: missing.join(", ") });
        }
      }
      if (idx === 9) {
        if (data.section10.authorizations.length < 4) {
          errs["s10"] = t("validation.acceptAuth");
        }
      }
      if (idx === 10) {
        if (!data.section11.signerName.trim()) errs["s11.signerName"] = t("validation.requiredField");
        if (!data.section11.signatureDataUrl) errs["s11.signature"] = t("validation.signRequired");
        if (!data.section11.signatureConsent) errs["s11.consent"] = t("validation.mustAgree");
      }
      return errs;
    },
    [data, t]
  );

  const persistStep = (idx: number) => {
    setData((d) => ({
      ...d,
      _ui: { ...(d._ui ?? {}), lastStep: Math.min(idx, TOTAL_STEPS) },
    }));
  };

  const goto = (idx: number) => {
    const target = Math.max(0, Math.min(idx, TOTAL_STEPS));
    setErrors({});
    setStep(target);
    persistStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const next = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors({});
    const target = Math.min(step + 1, TOTAL_STEPS);
    setStep(target);
    persistStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const ensureDraft = async (): Promise<string> => {
    const res = await fetch("/api/registration/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, data, language: currentLang }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.registration?.id) {
      throw new Error(json?.message || json?.error || "draft_save_failed");
    }
    return json.registration.id as string;
  };

  // Uploads a document right after the supplier selects it, so the UI can show
  // live progress instead of waiting until draft save / submit.
  const uploadDocumentFile = async (
    ref: string,
    file: File,
    onProgress: (pct: number) => void
  ): Promise<DocumentRow> => {
    const registrationId = await ensureDraft();
    const doc = await uploadDocument({ token, registrationId, ref, file, onProgress });
    const previous = attached.filter((a) => a.ref === ref);
    for (const old of previous) {
      await fetch(`/api/upload/${old.id}?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      }).catch(() => null);
    }
    setAttached((current) => [...current.filter((a) => a.ref !== ref), doc]);
    setSavedAt(Date.now());
    return doc;
  };

  const saveDraftAndUpload = async (): Promise<DocumentRow[]> => {
    const registrationId = await ensureDraft();
    let uploaded = [...attached];

    // Digital signature → persist the image inside the supplier's SharePoint folder.
    const signatureDataUrl = data.section11.signatureDataUrl;
    if (signatureDataUrl && onedriveOn) {
      for (const d of uploaded.filter((x) => x.ref === SIGNATURE_REF)) {
        await fetch(`/api/upload/${d.id}?token=${encodeURIComponent(token)}`, {
          method: "DELETE",
        }).catch(() => null);
      }
      uploaded = uploaded.filter((x) => x.ref !== SIGNATURE_REF);
      const blob = await (await fetch(signatureDataUrl)).blob();
      const file = new File([blob], "Firma.png", { type: blob.type || "image/png" });
      const sigDoc = await uploadDocument({ token, registrationId, ref: SIGNATURE_REF, file });
      uploaded.push(sigDoc);
    }

    // Replace semantics: a re-uploaded ref must supersede the previous one, so
    // stale documents never show up again in the form.
    const uploadedByRef = new Map<string, DocumentRow>();
    for (const d of uploaded) uploadedByRef.set(d.ref, d);
    uploaded = [...uploadedByRef.values()];
    setAttached([...uploaded]);
    setSavedAt(Date.now());
    return uploaded;
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    setSubmitError(null);
    setDraftMessage(null);
    try {
      await saveDraftAndUpload();
      setDraftMessage(t("submit.draftSaved"));
    } catch (error) {
      setSubmitError(error instanceof Error ? `${t("docs.error")}: ${error.message}` : t("docs.error"));
    } finally {
      setSavingDraft(false);
    }
  };

  const submit = async () => {
    let invalid = false;
    for (const idx of [0, 8, 9, 10]) {
      const errs = validateStep(idx);
      for (const k of Object.keys(errs)) {
        if (errs[k]) {
          setErrors(errs);
          setStep(idx);
          invalid = true;
          break;
        }
      }
    }
    if (invalid) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setDraftMessage(null);
    try {
      const uploaded = await saveDraftAndUpload();
      const missingDocs = data.section9.documents.filter(
        (document) =>
          document.checked && !uploaded.some((attachedDoc) => attachedDoc.ref === document.ref)
      );
      if (missingDocs.length > 0) {
        setSubmitError(t("docs.missingCheckedDocuments", { n: missingDocs.length }));
        setStep(8);
        persistStep(8);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const res = await fetch("/api/registration/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, data, language: currentLang }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.registration) {
        setSubmission({
          reference: json.registration.reference_no ?? "",
          status: json.registration.status,
        });
        window.scrollTo({ top: 0 });
      } else if (json?.error === "already_submitted") {
        setSubmission({
          reference: registration?.reference_no ?? "",
          status: "PENDIENTE",
        });
      } else {
        throw new Error(json?.message || json?.error || `submit_failed_${res.status}`);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? `${t("docs.error")}: ${error.message}` : t("docs.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const setDocuments = (docs: SupplierData["section9"]["documents"]) =>
    setData((d) => ({ ...d, section9: { documents: docs } }));

  const currentTitle = TITLE_STEPS[Math.min(step, TOTAL_STEPS - 1)];
  const currentSub = SUB_STEPS[Math.min(step, TOTAL_STEPS - 1)];
  const progress = Math.round(((step + 1) / TOTAL_STEPS) * 100);

  if (submission) {
    const statusData: PortalStatusResult = {
      found: true,
      reference_no: submission.reference || registration?.reference_no,
      company_name: registration?.company_name || data.section1.legalName || "Proveedor Registrado",
      tax_id: registration?.tax_id || data.section1.taxId,
      provider_type: registration?.provider_type || data.section1.providerType,
      country: registration?.country || data.section1.nationality,
      status: (submission.status || registration?.status || "PENDIENTE") as SupplierStatus,
      submitted_at: registration?.submitted_at,
      updated_at: registration?.updated_at,
      created_at: registration?.created_at,
      can_edit: false,
      invitation_token: token,
      documents_count: attached.length,
    };

    return (
      <div className="mx-auto max-w-3xl">
        <EvaluationStatusCard data={statusData} />
      </div>
    );
  }

  return (
    <div>
      {registration?.status === "SOLICITUD_CAMBIOS" && (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/90 p-5 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-200 text-xs font-bold text-rose-800">
              !
            </div>
            <div className="flex-1 text-xs">
              <h3 className="font-display text-sm font-bold text-rose-950">
                Atención: Subsanación de Información Requerida
              </h3>
              <p className="mt-1 text-rose-900 leading-relaxed">
                El Oficial de Cumplimiento ha revisado su expediente y solicita actualizar datos o anexar documentación complementaria. Modifique las secciones indicadas y presione <strong>"Enviar registro"</strong> en el paso final para reenviar su expediente.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-navy-700">
            Sánchez Business & Corp.
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <span className="hidden text-[12px] text-ink-muted sm:block">
              {saving
                ? t("common.saving")
                : savedAt
                  ? `${t("common.saved")} · ${new Date(savedAt).toLocaleTimeString(currentLang, { hour: "2-digit", minute: "2-digit" })}`
                  : ""}
            </span>
            <LangToggle />
          </div>
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-[28px]">
          {t(currentTitle as never)}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{t(currentSub as never)}</p>
        <div className="mt-5">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy-800/10">
              <div
                className="h-full rounded-full bg-navy-800 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-ink-muted">
              {Math.min(step + 1, TOTAL_STEPS)} / {TOTAL_STEPS}
            </span>
          </div>
<p className="mt-1.5 text-[12px] text-ink-muted">
          {t("wizard.progress")}: {t(currentTitle as never)}
        </p>
        <nav
          aria-label="Secciones (móvil)"
          className="mt-3 flex gap-1.5 overflow-x-auto pb-1 lg:hidden"
        >
          {TITLE_STEPS.map((key, i) => {
            const active = i === step && step < TOTAL_STEPS;
            const done = i < step;
            return (
              <button
                key={key}
                type="button"
                onClick={() => goto(i)}
                title={t(key as never) as string}
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors",
                  active
                    ? "bg-navy-800 text-white"
                    : done
                      ? "bg-navy-800/10 text-navy-800"
                      : "bg-navy-800/5 text-ink-muted"
                )}
              >
                {done ? "✓" : i + 1}
              </button>
            );
          })}
        </nav>
      </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:gap-8">
        <nav aria-label="Secciones" className="hidden lg:block">
          <ol className="sticky top-24 space-y-1">
            {TITLE_STEPS.map((key, i) => {
              const active = i === step && step < TOTAL_STEPS;
              const done = i < step;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => goto(i)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
                      active ? "bg-navy-800 text-white shadow-sm" : "text-ink-soft hover:bg-navy-800/5"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold",
                        active
                          ? "bg-white/15 text-white"
                          : done
                            ? "bg-navy-800 text-white"
                            : "bg-navy-800/10 text-ink-soft"
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className={cn(active && "font-medium")}>{t(key as never)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="min-w-0">
          <div className="rounded-3xl border border-navy-800/10 bg-white p-5 shadow-[0_6px_24px_rgba(10,28,49,0.08)] sm:p-10">
            {errors["s9"] && step === 8 && (
              <p className="mb-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-[13px] text-danger">
                {errors["s9"]}
              </p>
            )}
            {errors["s10"] && step === 9 && (
              <p className="mb-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-[13px] text-danger">
                {errors["s10"]}
              </p>
            )}

            {step === 0 && <Section1 data={data} set={setData} errors={errors} />}
            {step === 1 && <Section2 data={data} set={setData} errors={errors} />}
            {step === 2 && <Section3 data={data} set={setData} errors={errors} />}
            {step === 3 && <Section4 data={data} set={setData} errors={errors} />}
            {step === 4 && <Section5 data={data} set={setData} errors={errors} />}
            {step === 5 && <Section6 data={data} set={setData} errors={errors} />}
            {step === 6 && <Section7 data={data} set={setData} errors={errors} />}
            {step === 7 && <Section8 data={data} set={setData} errors={errors} />}
            {step === 8 && (
              <DocumentsStep
                documents={data.section9.documents}
                setDocuments={setDocuments}
                token={token}
                attached={attached}
                setAttached={setAttached}
                uploadFile={uploadDocumentFile}
                onedriveOn={onedriveOn}
              />
            )}
            {step === 9 && <Section10 data={data} set={setData} errors={errors} />}
            {step === 10 && (
              <Section11
                data={data}
                set={setData}
                errors={errors}
                signaturePad={
                  <SignaturePad
                    value={data.section11.signatureDataUrl}
                    onChange={(v) =>
                      setData((d) => ({
                        ...d,
                        section11: { ...d.section11, signatureDataUrl: v },
                      }))
                    }
                  />
                }
              />
            )}
            {step === TOTAL_STEPS && (
              <div>
                <p className="mb-5 text-sm text-ink-muted">{t("wizard.reviewNote")}</p>
                <ReviewStep
                  data={data}
                  attached={attached}
                  documents={data.section9.documents}
                  onEdit={goto}
                />
              </div>
            )}
          </div>

          {step < TOTAL_STEPS ? (
            <div className="sticky bottom-3 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy-800/10 bg-white/95 p-3 shadow-[0_4px_16px_rgba(10,28,49,0.08)] backdrop-blur">
              {submitError && (
                <p role="alert" className="w-full break-words text-xs text-danger">
                  {submitError}
                </p>
              )}
              {draftMessage && (
                <p role="status" className="w-full text-xs text-success">
                  {draftMessage}
                </p>
              )}
              <Button
                variant="secondary"
                onClick={() => goto(Math.max(0, step - 1))}
                disabled={step === 0}
              >
                ← {t("common.back")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void saveDraft()}
                disabled={savingDraft || submitting}
              >
                {savingDraft ? t("submit.savingDraft") : t("submit.saveDraft")}
              </Button>
              {step === TOTAL_STEPS - 1 ? (
                <Button onClick={next} size="lg">
                  {t("wizard.finalReview")} →
                </Button>
              ) : (
                <Button onClick={next} size="lg">
                  {t("common.continue")} →
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-navy-800/10 bg-white/95 p-3 shadow-[0_4px_16px_rgba(10,28,49,0.08)] backdrop-blur">
              {submitError && (
                <p role="alert" className="mr-auto min-w-0 flex-1 break-words text-xs text-danger">
                  {submitError}
                </p>
              )}
              {draftMessage && (
                <p role="status" className="mr-auto min-w-0 flex-1 text-xs text-success">
                  {draftMessage}
                </p>
              )}
              <Button variant="secondary" onClick={() => goto(TOTAL_STEPS - 1)}>
                ← {t("common.back")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void saveDraft()}
                disabled={savingDraft || submitting}
              >
                {savingDraft ? t("submit.savingDraft") : t("submit.saveDraft")}
              </Button>
              <Button onClick={() => void submit()} size="lg" disabled={submitting || savingDraft}>
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t("common.loading")}
                  </>
                ) : (
                  t("submit.confirmSubmit")
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}