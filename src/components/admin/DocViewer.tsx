"use client";

import { useEffect, useState } from "react";
import { useDict, useI18n } from "@/lib/i18n";
import { type DocumentRow, type RegistrationRow } from "@/lib/types";
import { canPreview } from "@/lib/upload-policy";
import { cn, formatBytes } from "@/lib/utils";

function fileExt(name?: string | null): string {
  if (!name) return "?";
  const i = name.lastIndexOf(".");
  if (i < 0 || i === name.length - 1) return "?";
  return name.slice(i + 1).slice(0, 5);
}

export function DocViewer({
  reg,
  docs,
}: {
  reg: RegistrationRow;
  docs: DocumentRow[];
}) {
  const { t } = useI18n();
  const dict = useDict();
  const [active, setActive] = useState<DocumentRow | null>(null);

  useEffect(() => {
    if (!active) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const proxy = (d: DocumentRow, dl = false) =>
    `/api/admin/doc/${reg.id}/${d.id}${dl ? "?dl=1" : ""}`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
            {t("admin.detail.viewerTitle")}
          </h1>
          <p className="mt-1 text-[13px] text-ink-soft">{t("admin.detail.viewerSubtitle")}</p>
        </div>
        <a
          href={`/admin/suppliers/${reg.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-navy-900"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t("admin.detail.viewerBack")}
        </a>
      </div>

      {docs.length === 0 && (
        <div className="rounded-3xl border border-navy-800/10 bg-white px-6 py-16 text-center text-sm text-ink-muted">
          {t("admin.detail.noDocuments")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((doc) => {
          const previewable = canPreview(doc.file_name, doc.file_size);
          const desc =
            dict.s9.docDescriptions[doc.ref as keyof typeof dict.s9.docDescriptions] ??
            doc.ref;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => setActive(doc)}
              className="group overflow-hidden rounded-2xl border border-navy-800/10 bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(10,28,49,0.12)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-bone-100">
                {previewable ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic admin proxy needs auth cookies, next/image can't fetch it
                  <img
                    src={proxy(doc)}
                    alt={doc.file_name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy-800 to-navy-950">
                    <span className="grid place-items-center rounded-xl bg-white/15 px-4 py-3 font-mono text-[15px] font-bold uppercase tracking-wider text-white">
                      {fileExt(doc.file_name)}
                    </span>
                  </div>
                )}
                <span className="absolute left-2.5 top-2.5 grid h-6 w-8 place-items-center rounded-md bg-navy-800/90 text-[10.5px] font-bold text-white shadow-sm">
                  {doc.ref}
                </span>
                {!previewable && (
                  <span className="absolute right-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-ink-muted shadow-sm">
                    {t("admin.detail.previewUnavailable")}
                  </span>
                )}
              </div>
              <div className="border-t border-navy-800/5 p-3.5">
                <p className="truncate text-[13px] font-medium text-ink" title={doc.file_name}>
                  {doc.file_name}
                </p>
                <p className="mt-0.5 truncate text-[11.5px] text-ink-muted">
                  <span className="font-medium text-navy-700">{desc}</span>
                  <span className="mx-1.5">·</span>
                  {formatBytes(doc.file_size)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            className="absolute inset-0 bg-navy-900/70 backdrop-blur-sm"
            onClick={() => setActive(null)}
            aria-hidden
          />
          <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-800/10 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="flex items-center gap-2">
                  <span className="grid h-6 w-8 shrink-0 place-items-center rounded-md bg-navy-800 text-[10.5px] font-bold text-white">
                    {active.ref}
                  </span>
                  <span className="truncate text-[14px] font-semibold text-ink">
                    {active.file_name}
                  </span>
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-muted">
                  {formatBytes(active.file_size)}
                  <span className="mx-1.5">·</span>
                  {dict.s9.docDescriptions[active.ref as keyof typeof dict.s9.docDescriptions] ??
                    active.ref}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={proxy(active, true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-navy-800/15 bg-white px-3 py-2 text-[12.5px] font-semibold text-navy-800 transition-colors hover:bg-bone-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {t("admin.detail.download")}
                </a>
                <a
                  href={active.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-navy-800 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-900"
                >
                  {t("admin.detail.openInSharePoint")}
                </a>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="rounded-xl border border-navy-800/15 px-3 py-2 text-[12.5px] font-semibold text-ink-muted transition-colors hover:bg-bone-50"
                >
                  {t("admin.detail.close")}
                </button>
              </div>
            </div>

            <div className={cn("min-h-0 flex-1 bg-bone-50", !canPreview(active.file_name, active.file_size) && "grid place-items-center p-8")}>
              {canPreview(active.file_name, active.file_size) ? (
                active.file_name.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={proxy(active)}
                    title={active.file_name}
                    className="h-[62vh] w-full"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic admin proxy needs auth cookies, next/image can't fetch it
                  <img
                    src={proxy(active)}
                    alt={active.file_name}
                    className="mx-auto max-h-[62vh] w-auto max-w-full object-contain p-2"
                  />
                )
              ) : (
                <div className="rounded-2xl border border-navy-800/10 bg-white px-8 py-12 text-center">
                  <p className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-50 text-[16px] font-bold uppercase text-navy-700">
                    {fileExt(active.file_name)}
                  </p>
                  <p className="mt-4 max-w-[34ch] text-[13px] leading-relaxed text-ink-muted">
                    {t("admin.detail.previewUnavailable")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}