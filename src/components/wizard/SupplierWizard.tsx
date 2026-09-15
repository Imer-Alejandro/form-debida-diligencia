"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import {
  documentCatalog,
  emptyData,
  type DocumentRow,
  type RegistrationRow,
  type SupplierData,
} from "@/lib/types";
import { cn } from "@/lib/utils";
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

function initData(initial: SupplierData | null): SupplierData {
  if (initial) {
    const hasDocs = (initial.section9.documents?.length ?? 0) > 0;
    return {
      ...emptyData(),
      ...initial,
      section9: {
        documents: hasDocs
          ? initial.section9.documents
          : documentCatalog.map((d) => ({ ref: d.ref, checked: false, note: "" })),
      },
    };
  }
  const base = emptyData();
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
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(
    registration?.id ?? null
  );
  const [attached, setAttached] = useState<DocumentRow[]>([]);
  const [onedriveOn, setOnedriveOn] = useState(true);
  const [submission, setSubmission] = useState<
    { reference: string; status: string } | null
  >(
    registration &&
      !["BORRADOR", "SOLICITUD_CAMBIOS", "PENDIENTE"].includes(registration.status)
      ? { reference: registration.reference_no ?? "", status: registration.status }
      : null
  );
  const [submitting, setSubmitting] = useState(false);
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
        if (res.ok && json?.registration?.id) {
          setRegistrationId((old) => old ?? json.registration.id);
          setSavedAt(Date.now());
        }
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

  const goto = (idx: number) => {
    setErrors({});
    setStep(idx);
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
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const ensureDraft = useCallback(async (): Promise<string | null> => {
    if (registrationId) return registrationId;
    const res = await fetch("/api/registration/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, data, language: currentLang }),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.registration?.id) {
      setRegistrationId(json.registration.id);
      return json.registration.id;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationId, token, data]);

  const submit = async () => {
    let invalid = false;
    for (const idx of [0, 9, 10]) {
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
    try {
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
        window.alert(t("docs.error"));
      }
    } catch {
      window.alert(t("docs.error"));
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
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-navy-800/10 bg-white p-8 text-center shadow-[0_1px_2px_rgba(10,28,49,0.04)] sm:p-12">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-success/10">
            <svg className="h-8 w-8 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
            {t("submit.submitSuccessTitle")}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            {t("submit.submitSuccessSub")}
          </p>
          <div className="mx-auto mt-7 w-fit rounded-2xl border border-navy-800/10 bg-bone-50 px-6 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              {t("submit.reference")}
            </p>
            <p className="mt-1 font-mono text-xl font-semibold text-navy-800">
              {submission.reference || "—"}
            </p>
          </div>
          <p className="mx-auto mt-6 max-w-md text-[12.5px] leading-relaxed text-ink-muted">
            {t("submit.whatNow")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="secondary" onClick={() => window.print()}>
              {t("submit.printCopy")}
            </Button>
            <Link href="/" className="text-sm font-medium text-navy-700 underline underline-offset-2">
              {t("submit.backHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-navy-700">
            Sanchez Business Corp
          </span>
          <span className="hidden text-[12px] text-ink-muted sm:block">
            {saving
              ? t("common.saving")
              : savedAt
                ? `${t("common.saved")} · ${new Date(savedAt).toLocaleTimeString(currentLang, { hour: "2-digit", minute: "2-digit" })}`
                : ""}
          </span>
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
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
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
          <div className="rounded-3xl border border-navy-800/10 bg-white p-5 shadow-[0_1px_2px_rgba(10,28,49,0.04)] sm:p-8">
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
                registrationId={registrationId}
                onEnsureDraft={ensureDraft}
                attached={attached}
                setAttached={setAttached}
                onedriveOn={onedriveOn}
                setOnedriveOn={setOnedriveOn}
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
            <div className="sticky bottom-3 z-10 mt-5 flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                onClick={() => goto(Math.max(0, step - 1))}
                disabled={step === 0}
              >
                ← {t("common.back")}
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
            <div className="mt-5 flex items-center justify-between gap-3">
              <Button variant="secondary" onClick={() => goto(TOTAL_STEPS - 1)}>
                ← {t("common.back")}
              </Button>
              <Button onClick={() => void submit()} size="lg" disabled={submitting}>
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