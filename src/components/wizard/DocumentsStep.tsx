"use client";

import { useRef, useState } from "react";
import { useDict, useI18n } from "@/lib/i18n";
import { documentCatalog, type DocumentIntent, type DocumentRow } from "@/lib/types";
import { validateFile } from "@/lib/upload-policy";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface DocumentsStepProps {
  documents: DocumentIntent[];
  setDocuments: (docs: DocumentIntent[]) => void;
  token: string;
  attached: DocumentRow[];
  setAttached: (docs: DocumentRow[]) => void;
  uploadFile: (ref: string, file: File, onProgress: (pct: number) => void) => Promise<DocumentRow>;
  onedriveOn: boolean;
  uploading: boolean;
}

type BusyState = { pct: number; error?: boolean };

export function DocumentsStep({
  documents,
  setDocuments,
  token,
  attached,
  setAttached,
  uploadFile,
  onedriveOn,
  uploading,
}: DocumentsStepProps) {
  const { t } = useI18n();
  const dict = useDict();
  const s9 = dict.s9;
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [busy, setBusy] = useState<Record<string, BusyState>>({});

  const toggle = (ref: string) => {
    if (documents.find((item) => item.ref === ref)?.checked) {
      setBusy((b) => {
        const next = { ...b };
        delete next[ref];
        return next;
      });
    }
    setDocuments(
      documents.map((d) => (d.ref === ref ? { ...d, checked: !d.checked } : d))
    );
  };

  const noteFor = (ref: string, e: string) =>
    setDocuments(documents.map((d) => (d.ref === ref ? { ...d, note: e } : d)));

  const selectFile = async (ref: string, file: File) => {
    if (uploading) {
      window.alert(t("docs.uploadLocked"));
      return;
    }
    const err = validateFile(file);
    if (err === "too_large") {
      window.alert(t("validation.fileTooLarge"));
      return;
    }
    if (err === "unsupported_type") {
      window.alert(t("validation.unsupportedType"));
      return;
    }
    setBusy((b) => ({ ...b, [ref]: { pct: 0 } }));
    try {
      await uploadFile(ref, file, (pct) =>
        setBusy((b) => ({ ...b, [ref]: { pct } }))
      );
      setBusy((b) => {
        const next = { ...b };
        delete next[ref];
        return next;
      });
    } catch {
      setBusy((b) => ({ ...b, [ref]: { pct: 0, error: true } }));
    }
  };

  const remove = async (doc: DocumentRow) => {
    const res = await fetch(`/api/upload/${doc.id}?token=${encodeURIComponent(token)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setAttached(attached.filter((d) => d.id !== doc.id));
    } else {
      const json = await res.json().catch(() => null);
      window.alert(
        json?.error === "not_configured"
          ? t("docs.removeNotConfigured")
          : t("docs.removeFailed")
      );
    }
  };

  const attachedCount = attached.length;
  const processing = Object.keys(busy).length;
  const showsDeps = attachedCount > 0 || processing > 0;

  return (
    <div className="space-y-5">
      {!onedriveOn && (
        <p className="rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-[12.5px] leading-relaxed text-warning">
          {t("docs.notConfigured")}
        </p>
      )}
      <p className="text-[13px] text-ink-muted">{s9.usesOnlyWhenNeeded}</p>

      {processing > 0 && (
        <div className="flex items-center gap-2.5 rounded-xl border border-navy-800/15 bg-navy-50 px-4 py-3 text-[12.5px] font-medium text-navy-700">
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-navy-800/25 border-t-navy-800" />
          {t("docs.processingCount", { n: String(processing) })}
        </div>
      )}

      {showsDeps && (
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-navy-800/10 bg-bone-50 px-3 py-1.5 font-medium text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t("docs.attachedCount", { n: String(attachedCount) })}
          </span>
          {processing > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/5 px-3 py-1.5 font-medium text-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              {t("docs.processingCount", { n: String(processing) })}
            </span>
          )}
        </div>
      )}

      <div className="divide-y divide-navy-800/5 overflow-hidden rounded-2xl border border-navy-800/10 bg-white">
        {documents.map((el) => {
          const meta = documentCatalog.find((d) => d.ref === el.ref);
          const attachedForRef = attached.filter((d) => d.ref === el.ref);
          const state = busy[el.ref];
          const isPending = el.checked && attachedForRef.length === 0 && !state;
          return (
            <div key={el.ref} className={cn("px-4 py-4 sm:px-5", el.checked && "bg-bone-50/60")}>
              <div className="flex flex-wrap items-start gap-3">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={el.checked}
                    onChange={() => toggle(el.ref)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-navy-800"
                  />
                  <span className="min-w-0">
                    <span className="inline-flex items-baseline gap-2">
                      <span className="grid h-6 w-8 shrink-0 place-items-center rounded-md bg-navy-800 text-[11px] font-semibold text-white">
                        {el.ref}
                      </span>
                      <span className="text-sm font-medium leading-snug text-ink">
                        {s9.docDescriptions[el.ref as keyof typeof s9.docDescriptions]}
                      </span>
                      {meta?.requirement === "required" && (
                        <span className="rounded-full border border-rose-200/70 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                          {t("s9.requirements.required")}
                        </span>
                      )}
                      {meta?.requirement === "optional" && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {t("s9.requirements.optional")}
                        </span>
                      )}
                      {meta?.requirement === "contractor" && (
                        <span className="rounded-full border border-navy-800/15 bg-navy-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-700">
                          {t("s9.requirements.contractor")}
                        </span>
                      )}
                    </span>
                    <span className="ml-1 mt-0.5 block text-[11.5px] text-ink-muted sm:ml-10">
                      {s9.appliesTo}:{" "}
                      {s9.appliesToOptions[meta?.appliesTo as keyof typeof s9.appliesToOptions] ??
                        meta?.appliesTo}
                    </span>
                  </span>
                  {state ? (
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy-800/15 bg-navy-50 px-2.5 py-1 text-[11px] font-medium text-navy-700">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-navy-800/25 border-t-navy-800" />
                      {state.error
                        ? t("docs.error")
                        : t("docs.progressLabel", { pct: String(state.pct) })}
                    </span>
                  ) : (
                    isPending &&
                    onedriveOn && (
                      <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/30 bg-warning/5 px-2.5 py-1 text-[11px] font-medium text-warning">
                        {t("docs.pending")}
                      </span>
                    )
                  )}
                </label>
              </div>

              {el.checked && (
                <div className="ml-1 mt-3 space-y-3 sm:ml-10">
                  {attachedForRef.length > 0 && (
                    <ul className="space-y-2">
                      {attachedForRef.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-navy-800/10 bg-white px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 truncate">
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-navy-700 underline decoration-navy-700/30 underline-offset-2 hover:decoration-navy-700"
                            >
                              {d.file_name}
                            </a>
                            <span className="ml-2 text-xs text-ink-muted">
                              {formatBytes(d.file_size)}
                            </span>
                          </span>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-[11px] font-medium text-success">
                              ✓ {t("docs.uploaded")}
                            </span>
                            <button
                              type="button"
                              onClick={() => remove(d)}
                              className="text-xs text-ink-muted underline hover:text-danger"
                            >
                              {t("docs.remove")}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {state && (
                    <div className="rounded-xl border border-navy-800/15 bg-navy-50/60 px-3 py-3">
                      {state.error ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[12.5px] font-medium text-rose-600">
                            {t("docs.error")}
                          </span>
                          <button
                            type="button"
                            onClick={() => inputRefs.current[el.ref]?.click()}
                            disabled={uploading}
                            className="text-xs font-semibold text-navy-700 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {t("docs.retry")}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11.5px] font-medium text-navy-700">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-navy-800/25 border-t-navy-800" />
                              {t("docs.processing")}
                            </span>
                            <span className="tabular-nums">
                              {t("docs.progressLabel", { pct: String(state.pct) })}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-navy-800/10">
                            <div
                              className="h-full rounded-full bg-navy-800 transition-all duration-300"
                              style={{ width: `${state.pct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {attachedForRef.length > 0 && !state && (
                    <p className="text-[11.5px] text-ink-muted">{t("docs.willReplace")}</p>
                  )}

                  <input
                    ref={(n) => {
                      inputRefs.current[el.ref] = n;
                    }}
                    type="file"
                    className="sr-only"
                    disabled={uploading}
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.odt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.txt,.rtf,.zip"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void selectFile(el.ref, f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={!!state || uploading}
                    onClick={() => inputRefs.current[el.ref]?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-800/20 bg-white px-4 py-5 text-sm transition-colors hover:border-navy-800/50 hover:bg-bone-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t("docs.dropHint")}
                  </button>
                </div>
              )}

              <div className="ml-1 mt-2 sm:ml-10">
                <input
                  value={el.note}
                  onChange={(e) => noteFor(el.ref, e.target.value)}
                  placeholder={t("s9.observation")}
                  className="w-full rounded-lg border-0 border-b border-navy-800/10 bg-transparent px-1 py-1.5 text-[13px] text-ink transition-colors placeholder:text-ink-muted/60 focus:border-navy-600 focus:outline-none"
                />
              </div>
            </div>
          );
        })}
      </div>
      {onedriveOn && (
        <p className="flex flex-col gap-1 text-[12px] text-ink-muted sm:flex-row sm:items-start sm:gap-2">
          <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
          <span>
            {t("docs.onedriveNote")}{" "}
            <span className="text-ink-muted/80">{t("docs.typeHint")}</span>
          </span>
        </p>
      )}
    </div>
  );
}
