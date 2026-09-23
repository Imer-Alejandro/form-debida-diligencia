"use client";

import { useRef, useState } from "react";
import { useDict, useI18n } from "@/lib/i18n";
import { documentCatalog, type DocumentIntent, type DocumentRow } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

const MAX_BYTES = 50 * 1024 * 1024;

interface DocumentsStepProps {
  documents: DocumentIntent[];
  setDocuments: (docs: DocumentIntent[]) => void;
  token: string;
  registrationId: string | null;
  onEnsureDraft: () => Promise<string | null>;
  attached: DocumentRow[];
  setAttached: (docs: DocumentRow[]) => void;
  onedriveOn: boolean;
  setOnedriveOn: (v: boolean) => void;
}

export function DocumentsStep({
  documents,
  setDocuments,
  token,
  registrationId,
  onEnsureDraft,
  attached,
  setAttached,
  onedriveOn,
  setOnedriveOn,
}: DocumentsStepProps) {
  const { t } = useI18n();
  const dict = useDict();
  const s9 = dict.s9;
  const [busy, setBusy] = useState<Record<string, "uploading" | "error" | undefined>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const toggle = (ref: string) =>
    setDocuments(
      documents.map((d) => (d.ref === ref ? { ...d, checked: !d.checked } : d))
    );

  const noteFor = (ref: string, e: string) =>
    setDocuments(documents.map((d) => (d.ref === ref ? { ...d, note: e } : d)));

  const upload = async (ref: string, file: File) => {
    if (file.size > MAX_BYTES) {
      setBusy((b) => ({ ...b, [ref]: "error" }));
      window.alert(t("docs.tooLarge"));
      return;
    }
    setBusy((b) => ({ ...b, [ref]: "uploading" }));
    try {
      let regId = registrationId;
      if (!regId) regId = await onEnsureDraft();
      if (!regId) throw new Error("no_draft");

      const sessionRes = await fetch("/api/upload/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          registrationId: regId,
          ref,
          fileName: file.name,
        }),
      });
      const session = await sessionRes.json();
      if (!sessionRes.ok) {
        if (session.error === "not_configured") {
          setOnedriveOn(false);
          setBusy((b) => ({ ...b, [ref]: undefined }));
          return;
        }
        throw new Error(session.error?.message || "start_failed");
      }

      const put = await fetch(session.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "Content-Length": String(file.size),
          "Content-Range": `bytes 0-${file.size - 1}/${file.size}`,
        },
        body: file,
      });
      if (!put.ok) throw new Error(`upload_failed:${put.status}`);

      const finRes = await fetch("/api/upload/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          registrationId: regId,
          ref,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        }),
      });
      const fin = await finRes.json();
      if (!finRes.ok) throw new Error(fin.error?.message || "finalize_failed");
      setAttached([...attached.filter((d) => !(d.ref === ref && d.file_name === file.name)), fin.doc]);
      setBusy((b) => ({ ...b, [ref]: undefined }));
    } catch {
      setBusy((b) => ({ ...b, [ref]: "error" }));
    }
  };

  const remove = async (doc: DocumentRow) => {
    const res = await fetch(`/api/upload/${doc.id}?token=${encodeURIComponent(token)}`, {
      method: "DELETE",
    });
    if (res.ok) setAttached(attached.filter((d) => d.id !== doc.id));
  };

  const isBusy = (ref: string) => busy[ref] === "uploading";

  return (
    <div className="space-y-5">
      {!onedriveOn && (
        <p className="rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-[12.5px] leading-relaxed text-warning">
          {t("docs.notConfigured")}
        </p>
      )}
      <p className="text-[13px] text-ink-muted">{s9.usesOnlyWhenNeeded}</p>
      <div className="divide-y divide-navy-800/5 overflow-hidden rounded-2xl border border-navy-800/10 bg-white">
        {documents.map((el) => {
          const meta = documentCatalog.find((d) => d.ref === el.ref);
          const attachedForRef = attached.filter((d) => d.ref === el.ref);
          const isUp = isBusy(el.ref);
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
                    <span className="ml-10 mt-0.5 block text-[11.5px] text-ink-muted">
                      {s9.appliesTo}:{" "}
                      {s9.appliesToOptions[meta?.appliesTo as keyof typeof s9.appliesToOptions] ??
                        meta?.appliesTo}
                    </span>
                  </span>
                </label>
              </div>

              {el.checked && onedriveOn && (
                <div className="ml-10 mt-3 space-y-3">
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
                          <div className="flex items-center gap-3">
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
                  <input
                    ref={(n) => {
                      inputRefs.current[el.ref] = n;
                    }}
                    type="file"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(el.ref, f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={isUp}
                    onClick={() => inputRefs.current[el.ref]?.click()}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-sm transition-colors",
                      isUp
                        ? "cursor-wait border-navy-800/20 text-ink-muted"
                        : "border-navy-800/20 bg-white hover:border-navy-800/50 hover:bg-bone-50",
                      busy[el.ref] === "error" && "border-danger/40 text-danger"
                    )}
                  >
                    {isUp ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy-800/20 border-t-navy-800" />
                        {t("docs.uploading")}
                      </>
                    ) : busy[el.ref] === "error" ? (
                      t("docs.error")
                    ) : (
                      t("docs.dropHint")
                    )}
                  </button>
                </div>
              )}

              <div className="ml-10 mt-2">
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
        <p className="flex items-start gap-2 text-[12px] text-ink-muted">
          <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
          {t("docs.onedriveNote")}
        </p>
      )}
    </div>
  );
}