"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import type { PortalStatusResult, SupplierStatus } from "./types";
import { cn, formatDate } from "@/lib/utils";
import { useI18n, useDict } from "@/lib/i18n";

interface EvaluationStatusCardProps {
  data: PortalStatusResult;
  onReset?: () => void;
}

export function EvaluationStatusCard({
  data,
  onReset,
}: EvaluationStatusCardProps) {
  const { t, lang } = useI18n();
  const dict = useDict();
  const [copied, setCopied] = useState(false);

  const copyReference = () => {
    if (data.reference_no) {
      navigator.clipboard.writeText(data.reference_no);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStepState = (status: SupplierStatus) => {
    switch (status) {
      case "SIN_INICIAR":
      case "BORRADOR":
        return { currentStep: 1, step1Done: false, step2Done: false, step3Done: false, progress: 20 };
      case "PENDIENTE":
        return { currentStep: 2, step1Done: true, step2Done: false, step3Done: false, progress: 50 };
      case "EN_REVISION":
        return { currentStep: 2, step1Done: true, step2Done: false, step3Done: false, progress: 70 };
      case "SOLICITUD_CAMBIOS":
        return { currentStep: 2, step1Done: true, step2Done: false, step3Done: false, progress: 55 };
      case "APROBADO":
      case "APROBADO_CONDICIONES":
      case "RECHAZADO":
        return { currentStep: 3, step1Done: true, step2Done: true, step3Done: true, progress: 100 };
      default:
        return { currentStep: 1, step1Done: false, step2Done: false, step3Done: false, progress: 10 };
    }
  };

  const { currentStep, step1Done, step2Done, step3Done, progress } = getStepState(data.status);

  // Status configuration
  const getStatusConfig = (status: SupplierStatus) => {
    const portalStatus = dict.portal.status;
    switch (status) {
      case "SIN_INICIAR":
        return {
          tone: "gray" as const,
          label: portalStatus.SIN_INICIAR.label,
          headline: portalStatus.SIN_INICIAR.headline,
          desc: portalStatus.SIN_INICIAR.desc,
          alertClass: "border-slate-200 bg-slate-50 text-slate-700",
        };
      case "BORRADOR":
        return {
          tone: "amber" as const,
          label: portalStatus.BORRADOR.label,
          headline: portalStatus.BORRADOR.headline,
          desc: portalStatus.BORRADOR.desc,
          alertClass: "border-amber-200 bg-amber-50/80 text-amber-900",
        };
      case "PENDIENTE":
        return {
          tone: "blue" as const,
          label: portalStatus.PENDIENTE.label,
          headline: portalStatus.PENDIENTE.headline,
          desc: portalStatus.PENDIENTE.desc,
          alertClass: "border-sky-200 bg-sky-50/80 text-sky-900",
        };
      case "EN_REVISION":
        return {
          tone: "navy" as const,
          label: portalStatus.EN_REVISION.label,
          headline: portalStatus.EN_REVISION.headline,
          desc: portalStatus.EN_REVISION.desc,
          alertClass: "border-navy-200 bg-navy-50/80 text-navy-900",
        };
      case "SOLICITUD_CAMBIOS":
        return {
          tone: "red" as const,
          label: portalStatus.SOLICITUD_CAMBIOS.label,
          headline: portalStatus.SOLICITUD_CAMBIOS.headline,
          desc: portalStatus.SOLICITUD_CAMBIOS.desc,
          alertClass: "border-rose-200 bg-rose-50 text-rose-950",
        };
      case "APROBADO":
        return {
          tone: "green" as const,
          label: portalStatus.APROBADO.label,
          headline: portalStatus.APROBADO.headline,
          desc: portalStatus.APROBADO.desc,
          alertClass: "border-emerald-200 bg-emerald-50 text-emerald-950",
        };
      case "APROBADO_CONDICIONES":
        return {
          tone: "teal" as const,
          label: portalStatus.APROBADO_CONDICIONES.label,
          headline: portalStatus.APROBADO_CONDICIONES.headline,
          desc: portalStatus.APROBADO_CONDICIONES.desc,
          alertClass: "border-teal-200 bg-teal-50 text-teal-950",
        };
      case "RECHAZADO":
        return {
          tone: "red" as const,
          label: portalStatus.RECHAZADO.label,
          headline: portalStatus.RECHAZADO.headline,
          desc: portalStatus.RECHAZADO.desc,
          alertClass: "border-rose-200 bg-rose-50 text-rose-900",
        };
      default:
        return {
          tone: "gray" as const,
          label: portalStatus.SIN_INICIAR.label,
          headline: portalStatus.SIN_INICIAR.headline,
          desc: portalStatus.SIN_INICIAR.desc,
          alertClass: "border-slate-200 bg-slate-50 text-slate-800",
        };
    }
  };

  const config = getStatusConfig(data.status);
  const formattedDate = data.submitted_at || data.updated_at || data.created_at;
  const pStats = dict.portal.cardStats;
  const pSteps = dict.portal.cardSteps;
  const nextAction = pSteps.nextAction[data.status];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-[0_4px_24px_rgba(10,25,47,0.06)] transition-all">
      {/* Top ambient accent highlight */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-navy-900 via-teal-600 to-amber-500" />

      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={config.tone}>{config.label}</Badge>
            {data.provider_type && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                {data.provider_type === "juridica" ? pStats.juridica : pStats.fisica}
              </span>
            )}
            {data.country && (
              <span className="text-[11px] font-medium text-slate-400">· {data.country}</span>
            )}
          </div>
          <h2 className="mt-2.5 font-display text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {data.company_name || (lang === "es" ? "Proveedor Registrado" : "Registered Supplier")}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {data.reference_no && (
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-slate-400">Ref:</span>
                <span className="font-semibold text-slate-800">{data.reference_no}</span>
                <button
                  type="button"
                  onClick={copyReference}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title={pStats.copyRef}
                >
                  {copied ? (
                    <span className="text-[10px] text-teal-600 font-sans font-medium">{pStats.copied}</span>
                  ) : (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  )}
                </button>
              </div>
            )}
            {data.tax_id && (
              <div>
                <span className="text-slate-400">RNC/Tax ID: </span>
                <span className="font-semibold text-slate-700">{data.tax_id}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
            title={pStats.print}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect width="12" height="8" x="6" y="14" />
            </svg>
            <span className="hidden sm:inline">{pStats.print}</span>
          </button>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
              title={pStats.close}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              <span>{pStats.close}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stepper progress (Inspired by Image 1 "Project Progress") */}
      <div className="mt-8 rounded-2xl border border-slate-100 bg-[#f8fafc] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {pSteps.progressLabel}
          </span>
          <span className="text-xs font-semibold text-navy-900">
            {t("portal.cardSteps.stepPhase", { current: currentStep, total: 3, progress })}
          </span>
        </div>

        {/* Stepper visual bar */}
        <div className="relative mt-6 mb-2">
          {/* Background line */}
          <div className="absolute top-4 left-6 right-6 h-1 -translate-y-1/2 bg-slate-200 rounded-full" />
          {/* Active filled line */}
          <div
            className="absolute top-4 left-6 h-1 -translate-y-1/2 bg-gradient-to-r from-navy-900 via-teal-600 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `calc(${progress}% - 3rem)` }}
          />

          <div className="relative z-10 flex items-start justify-between">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center max-w-[120px] sm:max-w-[160px]">
              <div
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full text-xs font-bold shadow-xs transition-colors",
                  step1Done
                    ? "bg-navy-900 text-white"
                    : currentStep === 1
                      ? "border-2 border-navy-900 bg-white text-navy-900 ring-4 ring-navy-100"
                      : "bg-slate-200 text-slate-500"
                )}
              >
                {step1Done ? "✓" : "1"}
              </div>
              <span className="mt-2 font-display text-[12.5px] font-bold text-slate-900">
                {pSteps.step1}
              </span>
              <span className="mt-0.5 text-[11px] leading-tight text-slate-500 hidden sm:block">
                {pSteps.step1Sub}
              </span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center max-w-[120px] sm:max-w-[160px]">
              <div
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full text-xs font-bold shadow-xs transition-colors",
                  step2Done
                    ? "bg-navy-900 text-white"
                    : currentStep === 2
                      ? "border-2 border-teal-600 bg-white text-teal-700 ring-4 ring-teal-100 animate-pulse"
                      : "bg-slate-200 text-slate-500"
                )}
              >
                {step2Done ? "✓" : "2"}
              </div>
              <span className="mt-2 font-display text-[12.5px] font-bold text-slate-900">
                {pSteps.step2}
              </span>
              <span className="mt-0.5 text-[11px] leading-tight text-slate-500 hidden sm:block">
                {pSteps.step2Sub}
              </span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center max-w-[120px] sm:max-w-[160px]">
              <div
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full text-xs font-bold shadow-xs transition-colors",
                  step3Done
                    ? data.status === "RECHAZADO"
                      ? "bg-rose-600 text-white"
                      : "bg-emerald-600 text-white"
                    : currentStep === 3
                      ? "border-2 border-navy-900 bg-white text-navy-900 ring-4 ring-navy-100"
                      : "bg-slate-200 text-slate-500"
                )}
              >
                {step3Done ? (data.status === "RECHAZADO" ? "✕" : "✓") : "3"}
              </div>
              <span className="mt-2 font-display text-[12.5px] font-bold text-slate-900">
                {pSteps.step3}
              </span>
              <span className="mt-0.5 text-[11px] leading-tight text-slate-500 hidden sm:block">
                {pSteps.step3Sub}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main feedback & instructions box */}
      <div className={cn("mt-6 rounded-2xl border p-5 sm:p-6", config.alertClass)}>
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/80 shadow-2xs">
            {data.status === "SOLICITUD_CAMBIOS" ? (
              <span className="text-xs font-bold text-rose-600">!</span>
            ) : data.status === "APROBADO" ? (
              <span className="text-xs font-bold text-emerald-600">✓</span>
            ) : (
              <span className="text-xs font-bold text-navy-900">i</span>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-teal-800">
              {pSteps.nextActionLabel}
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-teal-950">{nextAction}</p>
          </div>
          <div className="flex-1">
            <h3 className="font-display text-sm font-bold tracking-tight">
              {config.headline}
            </h3>
            <p className="mt-1 text-xs leading-relaxed opacity-90">
              {config.desc}
            </p>

            {/* Evaluator notes if changes requested */}
            {data.status === "SOLICITUD_CAMBIOS" && data.note && (
              <div className="mt-3.5 rounded-xl border border-rose-200 bg-white/95 p-3.5 text-xs text-rose-950 shadow-2xs">
                <span className="font-semibold block mb-1 text-[11px] uppercase tracking-wider text-rose-700">
                  {pStats.officerInstructions}
                </span>
                <p className="whitespace-pre-line">{data.note}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details & stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-3 text-center sm:text-left">
          <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block">
            {pStats.documents}
          </span>
          <span className="mt-0.5 font-display text-sm font-bold text-slate-800 block">
            {data.documents_count ?? 0} {pStats.uploaded}
          </span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-3 text-center sm:text-left">
          <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block">
            {pStats.modality}
          </span>
          <span className="mt-0.5 font-display text-sm font-bold text-slate-800 block truncate">
            {data.provider_type === "juridica" ? pStats.juridica : pStats.fisica}
          </span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-3 text-center sm:text-left">
          <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block">
            {pStats.lastActivity}
          </span>
          <span className="mt-0.5 font-display text-xs font-semibold text-slate-700 block truncate">
            {formattedDate ? formatDate(formattedDate, lang) : pStats.pending}
          </span>
        </div>

        <div className="rounded-xl border border-slate-100 bg-[#f8fafc] p-3 text-center sm:text-left">
          <span className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold block">
            {pStats.platform}
          </span>
          <span className="mt-0.5 font-display text-xs font-semibold text-teal-700 block">
            {pStats.secureSharepoint}
          </span>
        </div>
      </div>

      {/* Primary Action bar */}
      <div className="mt-7 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11.5px] text-slate-400">
          {pStats.questions}{" "}
          <a
            href="mailto:compras@sanchezbusinesscorp.com"
            className="font-medium text-navy-800 underline hover:text-navy-900"
          >
            compras@sanchezbusinesscorp.com
          </a>
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {data.can_edit && data.invitation_token && (
            <Link
              href={`/i/${data.invitation_token}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 text-sm font-semibold text-white shadow-xs transition-all hover:bg-navy-800 hover:shadow-sm active:scale-[0.99]"
            >
              {data.status === "SOLICITUD_CAMBIOS" ? pStats.amendCta : pStats.continueCta}
            </Link>
          )}

          {!data.can_edit && data.invitation_token && (
            <Link
              href={`/i/${data.invitation_token}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              {pStats.viewDataCta}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
