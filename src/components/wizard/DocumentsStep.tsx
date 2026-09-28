"use client";

import { useRef } from "react";
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
  pendingFiles: PendingDocumentFile[];
  setPendingFiles: (files: PendingDocumentFile[]) => void;
  onedriveOn: boolean;
}

export interface PendingDocumentFile {
  ref: string;
  file: File;
}

export function DocumentsStep({
  documents,
  setDocuments,
  token,
  attached,
  setAttached,
  pendingFiles,
  setPendingFiles,
  onedriveOn,
}: DocumentsStepProps) {
  const { t } = useI18n();
  const dict = useDict();
  const s9 = dict.s9;
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const toggle = (ref: string) => {
    const document = documents.find((item) => item.ref === ref);
    if (document?.checked) {
      setPendingFiles(pendingFiles.filter((item) => item.ref !== ref));
    }
    setDocuments(
      documents.map((d) => (d.ref === ref ? { ...d, checked: !d.checked } : d))
    );
  };

  const noteFor = (ref: string, e: string) =>
    setDocuments(documents.map((d) => (d.ref === ref ? { ...d, note: e } : d)));

  const selectFile = (ref: string, file: File) => {
    const err = validateFile(file);
    if (err === "too_large") {
      window.alert(t("validation.fileTooLarge"));
      return;
    }
    if (err === "unsupported_type") {
      window.alert(t("validation.unsupportedType"));
      return;
    }
    setPendingFiles([
      ...pendingFiles.filter((pending) => pending.ref !== ref),
      { ref, file },
    ]);
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

  const checkedRefs = documents.filter(
    (d) => d.checked && !attached.some((a) => a.ref === d.ref)
  );
  const attachedCount = attached.length;
  const pendingCount = pendingFiles.length;
  const showsDeps = attachedCount > 0 || pendingCount > 0;

  return (
    <div className="space-y-5">
      {!onedriveOn && (
        <p className="rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-[12.5px] leading-relaxed text-warning">
          {t("docs.notConfigured")}
        </p>
      )}
      <p className="text-[13px] text-ink-muted">{s9.usesOnlyWhenNeeded}</p>

      {showsDeps && (
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-navy-800/10 bg-bone-50 px-3 py-1.5 font-medium text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t("docs.attachedCount", { n: String(attachedCount) })}
          </span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/5 px-3 py-1.5 font-medium text-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-warning" />
              {t("docs.pendingCount", { n: String(pendingCount) })}
            </span>
          )}
        </div>
      )}

      <div className="divide-y divide-navy-800/5 overflow-hidden rounded-2xl border border-navy-800/10 bg-white">
        {documents.map((el) => {
          const meta = documentCatalog.find((d) => d.ref === el.ref);
          const attachedForRef = attached.filter((d) => d.ref === el.ref);
          const pendingFile = pendingFiles.find((d) => d.ref === el.ref);
          const isPending = el.checked && attachedForRef.length === 0;
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
                    </span>
                    <span className="ml-1 mt-0.5 block text-[11.5px] text-ink-muted sm:ml-10">
                      {s9.appliesTo}:{" "}
                      {s9.appliesToOptions[meta?.appliesTo as keyof typeof s9.appliesToOptions] ??
                        meta?.appliesTo}
                    </span>
                  </span>
                  {isPending && onedriveOn && (
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/30 bg-warning/5 px-2.5 py-1 text-[11px] font-medium text-warning">
                      {t("docs.pending")}
                    </span>
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
                  {pendingFile && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate">
                        {pendingFile.file.name}
                        <span className="ml-2 text-xs text-ink-muted">
                          {formatBytes(pendingFile.file.size)} · {t("docs.pending")}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingFiles(pendingFiles.filter((d) => d.ref !== el.ref))
                        }
                        className="shrink-0 text-xs text-ink-muted underline hover:text-danger"
                      >
                        {t("docs.remove")}
                      </button>
                    </div>
                  )}
                  <input
                    ref={(n) => {
                      inputRefs.current[el.ref] = n;
                    }}
                    type="file"
                    className="sr-only"
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.odt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.txt,.rtf,.zip"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) selectFile(el.ref, f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => inputRefs.current[el.ref]?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-800/20 bg-white px-4 py-5 text-sm transition-colors hover:border-navy-800/50 hover:bg-bone-50"
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