"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { EvaluationStatusCard } from "./EvaluationStatusCard";
import type { PortalStatusResult } from "./types";
import { useI18n } from "@/lib/i18n";
import { getPortalLookupOutcome } from "@/lib/portal-lookup";

interface PortalLookupHeroProps {
  onOpenStartModal?: () => void;
  onOpenRequirementsModal?: () => void;
}

export function PortalLookupHero({
  onOpenStartModal,
  onOpenRequirementsModal,
}: PortalLookupHeroProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PortalStatusResult | null>(null);

  // If query looks like an invitation token (e.g. 32-char alphanumeric or /i/URL)
  const isDirectToken = (str: string) => {
    const s = str.trim();
    const urlMatch = s.match(/\/i\/([A-Za-z0-9]+)/);
    const candidate = (urlMatch ? urlMatch[1] : s).toUpperCase();
    return /^[A-Z0-9]{20,}$/.test(candidate) ? candidate : null;
  };

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) {
      setError(t("portal.emptyError"));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/portal/status?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const outcome = getPortalLookupOutcome(
        res.status,
        data?.found === true
      );

      if (outcome === "found") {
        setResult(data as PortalStatusResult);
        setError(null);
      } else if (outcome === "service-error") {
        setResult(null);
        setError(t("portal.networkError"));
      } else {
        const tokenCandidate = isDirectToken(q);
        if (tokenCandidate) {
          router.push(`/i/${tokenCandidate}`);
          return;
        }

        setResult(null);
        setError(t("portal.notFoundDesc"));
      }
    } catch {
      setResult(null);
      setError(t("portal.networkError"));
    } finally {
      setLoading(false);
    }
  };

  const applyExample = (val: string) => {
    setQuery(val);
    setError(null);
  };

  return (
    <div className="relative pt-6 pb-12 sm:pt-12 sm:pb-16">
      {/* Soft Ambient Mesh / Glow Background (Inspired by Image 1 & 2) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Warm amber / peach glowing aura */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[95%] max-w-5xl rounded-full bg-gradient-to-tr from-amber-200/45 via-rose-100/35 to-teal-100/40 blur-3xl opacity-85" />
        {/* Soft teal corporate ambient glow */}
        <div className="absolute top-12 -left-20 h-72 w-72 rounded-full bg-teal-200/25 blur-3xl" />
        {/* Subtle warm amber edge glow */}
        <div className="absolute top-8 -right-20 h-80 w-80 rounded-full bg-amber-100/40 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        {/* Institutional Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-1.5 text-xs font-semibold tracking-wide text-slate-800 shadow-2xs backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
          <span>Sánchez Business & Corp.</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-normal">{t("portal.badge")}</span>
        </div>

        {/* Hero Title */}
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl sm:leading-[1.12]">
          {t("portal.heroTitle")}
        </h1>

        {/* Hero Subtitle */}
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-lg">
          {t("portal.heroSubtitle")}
        </p>

        {/* Search & Action Box (Matching Image 1 & 2 floating search bar) */}
        <div className="mx-auto mt-8 max-w-2xl">
          <form
            onSubmit={handleSearch}
            aria-busy={loading}
            className="group relative flex flex-col gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-[0_8px_30px_rgba(10,25,47,0.08)] backdrop-blur-md transition-all focus-within:border-navy-800 focus-within:ring-4 focus-within:ring-navy-900/10 sm:flex-row sm:items-center sm:rounded-full sm:p-2 sm:pl-5"
          >
            <div className="flex flex-1 items-center gap-3 px-2 py-1">
              <label htmlFor="portal-status-search" className="sr-only">
                {t("portal.searchLabel")}
              </label>
              <svg
                className="h-5 w-5 shrink-0 text-slate-400 group-focus-within:text-navy-900 transition-colors"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                id="portal-status-search"
                type="text"
                value={query}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "portal-search-error" : undefined}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={t("portal.searchPlaceholder")}
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setError(null);
                  }}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={t("portal.clearSearch")}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 text-sm font-semibold text-white shadow-xs transition-all hover:bg-navy-800 hover:shadow-sm active:scale-[0.99] disabled:opacity-50 sm:w-auto sm:rounded-full"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>{t("portal.searching")}</span>
                  </span>
                ) : (
                  <span>{t("portal.searchCta")}</span>
                )}
              </button>
            </div>
            <span className="sr-only" role="status" aria-live="polite">
              {loading ? t("portal.searching") : ""}
            </span>
          </form>

          {/* Quick example tags & shortcuts */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
            <span className="text-slate-400">{t("portal.trySearching")}</span>
            <button
              type="button"
              onClick={() => applyExample("SB-2026-0010")}
              className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 text-[11.5px] font-medium text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              {t("portal.exampleRef")}
            </button>
            <button
              type="button"
              onClick={() => applyExample("40210977605")}
              className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-0.5 text-[11.5px] font-medium text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              {t("portal.exampleTax")}
            </button>
            <span className="text-slate-300">·</span>
            {onOpenStartModal && (
              <button
                type="button"
                onClick={onOpenStartModal}
                className="font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
              >
                {t("portal.haveInviteLink")}
              </button>
            )}
            {onOpenRequirementsModal && (
              <button
                type="button"
                onClick={onOpenRequirementsModal}
                className="font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2"
              >
                {t("portal.viewReqs")}
              </button>
            )}
          </div>

          {/* Error / Not found alert */}
          {error && (
            <div id="portal-search-error" role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-left text-xs leading-relaxed text-rose-900 shadow-2xs">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-200 text-rose-700 font-bold text-[11px]">
                  !
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-rose-950">{t("portal.notFoundTitle")}</p>
                  <p className="mt-0.5">{error}</p>
                  <p className="mt-2 text-rose-800">
                    {t("portal.supportNotice")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Evaluation Status Result (Image 1 Style Project Progress Card) */}
        {result && (
          <div className="mt-10 text-left animate-in fade-in slide-in-from-bottom-4 duration-300">
            <EvaluationStatusCard
              data={result}
              onReset={() => {
                setResult(null);
                setQuery("");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
