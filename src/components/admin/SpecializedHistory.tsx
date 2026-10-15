"use client";

import { SPECIALIZED_KINDS } from "@/lib/process";
import type { SpecializedHistoryEntry } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { formatDateTime } from "@/lib/utils";
import { getSpecializedHistoryChanges } from "@/lib/specialized-history";

export function SpecializedHistory({
  entries,
  unavailable = false,
}: {
  entries: SpecializedHistoryEntry[];
  unavailable?: boolean;
}) {
  const { t, lang } = useI18n();

  return (
    <section className="rounded-2xl border border-navy-800/10 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-[14px] font-semibold text-navy-900">
            {t("admin.detail.specializedHistoryTitle")}
          </h3>
          <p className="mt-0.5 text-[11.5px] text-ink-muted">
            {t("admin.detail.specializedHistoryHelp")}
          </p>
        </div>
        {!unavailable && (
          <span className="rounded-full border border-navy-800/10 bg-bone-50 px-2.5 py-1 text-[11px] font-medium text-ink-muted">
            {t("admin.detail.specializedHistoryCount", { n: entries.length })}
          </span>
        )}
      </div>

      {unavailable ? (
        <p
          role="status"
          className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] text-amber-900"
        >
          {t("admin.detail.specializedHistoryUnavailable")}
        </p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-[12px] text-ink-muted">
          {t("admin.detail.specializedHistoryEmpty")}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {SPECIALIZED_KINDS.map((kind) => {
            const changes = getSpecializedHistoryChanges(entries, kind);

            return (
              <div
                key={kind}
                className="rounded-xl border border-navy-800/10 bg-bone-50/40 p-3.5"
              >
                <h4 className="text-[12.5px] font-semibold text-ink">
                  {t(`admin.evaluation.specializedAreas.${kind}` as never)}
                </h4>
                {changes.length === 0 ? (
                  <p className="mt-2 text-[11px] text-ink-muted">
                    {t("admin.detail.specializedHistoryEmpty")}
                  </p>
                ) : (
                  <ol className="mt-2.5 space-y-3 border-l border-navy-800/15 pl-3">
                    {changes.map(({ entry, value, previous }) => (
                      <li key={entry.id} className="relative text-[11.5px]">
                        <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-teal-600 ring-2 ring-white" />
                        <p className="font-medium text-ink">
                          {previous
                            ? `${t(`admin.evaluation.specializedStatuses.${previous.status}` as never)} → `
                            : ""}
                          {t(`admin.evaluation.specializedStatuses.${value.status}` as never)}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-ink-muted">
                          {formatDateTime(entry.created_at, lang)}
                          {entry.created_by_email ? ` · ${entry.created_by_email}` : ""}
                        </p>
                        {value.by && (
                          <p className="mt-1 text-ink-muted">
                            {t("admin.detail.specializedHistoryResponsible")}: {value.by}
                          </p>
                        )}
                        {value.date && (
                          <p className="mt-0.5 text-ink-muted">
                            {t("admin.detail.specializedHistoryDate")}: {value.date}
                          </p>
                        )}
                        {value.notes && (
                          <p className="mt-1 whitespace-pre-wrap text-ink-muted">
                            {value.notes}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
