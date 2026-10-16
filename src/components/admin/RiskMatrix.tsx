"use client";

import { useI18n } from "@/lib/i18n";
import type { Evaluation, RiskLevel } from "@/lib/types";
import { Badge, type BadgeTone, Select, Textarea } from "@/components/ui";
import { RISK_CATEGORIES, computeRisk, evaluateTriggers } from "@/lib/risk";

const LEVEL_TONE: Record<string, BadgeTone> = {
  BAJO: "green",
  MEDIO: "amber",
  ALTO: "red",
  PENDIENTE: "gray",
};

function levelLabel(t: ReturnType<typeof useI18n>["t"], level: string): string {
  return t(`risk.${level}` as never);
}

export function RiskMatrix({
  evaluation,
  onChange,
}: {
  evaluation: Evaluation;
  onChange: (fn: (e: Evaluation) => Evaluation) => void;
}) {
  const { t } = useI18n();
  const e = t("admin.evaluation.riskTitle");
  const s12 = evaluation.section12;
  const ratings = s12.riskCategories ?? {};
  const result = computeRisk(ratings, s12.redFlag);
  const triggers = evaluateTriggers({
    ratings,
    redFlag: s12.redFlag,
    estimatedAmount: s12.estimatedAnnualAmount,
  });

  const setRating = (id: string, value: number) =>
    onChange((ev) => ({
      ...ev,
      section12: {
        ...ev.section12,
        riskCategories: { ...ev.section12.riskCategories, [id]: value },
      },
    }));

  return (
    <div className="rounded-2xl border border-navy-800/10 bg-bone-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-display text-[13.5px] font-semibold text-navy-900">{e}</h4>
          <p className="mt-0.5 max-w-xl text-[11.5px] leading-snug text-ink-muted">
            {t("admin.evaluation.riskHelp")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            {t("admin.evaluation.computed")}
          </span>
          <Badge tone={LEVEL_TONE[result.level] ?? "gray"} withDot>
            {levelLabel(t, result.level)}
          </Badge>
          {result.rated > 0 && (
            <span className="text-[11px] text-ink-muted">
              {t("admin.evaluation.average")}: {result.average}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-navy-800/10 bg-white">
        {RISK_CATEGORIES.map((cat, idx) => {
          const value = ratings[cat.id] ?? 0;
          return (
            <div
              key={cat.id}
              className={cnRow(idx)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-navy-800 font-mono text-[10px] font-bold text-white">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13px] font-medium text-ink">
                    {t(`riskCategories.${cat.id}` as never)}
                  </span>
                  {cat.optional && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      {t("admin.evaluation.optional")}
                    </span>
                  )}
                </div>
                <p className="ml-7 mt-0.5 text-[11px] leading-snug text-ink-muted">
                  {t(`riskCategoryScope.${cat.id}` as never)}
                </p>
              </div>
              <Select
                className="h-9 w-28 shrink-0 text-[12.5px]"
                value={String(value)}
                onChange={(ev) => setRating(cat.id, Number(ev.target.value))}
              >
                <option value="0">{t("admin.evaluation.notApplicable")}</option>
                <option value="1">{t("admin.evaluation.low")} (1)</option>
                <option value="2">{t("admin.evaluation.medium")} (2)</option>
                <option value="3">{t("admin.evaluation.high")} (3)</option>
              </Select>
            </div>
          );
        })}
      </div>

      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-rose-200/70 bg-rose-50/50 px-3.5 py-3">
        <input
          type="checkbox"
          checked={s12.redFlag}
          onChange={(ev) =>
            onChange((prev) => ({
              ...prev,
              section12: { ...prev.section12, redFlag: ev.target.checked },
            }))
          }
          className="mt-0.5 h-4 w-4 shrink-0 accent-rose-600"
        />
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-rose-700">
            {t("admin.evaluation.redFlag")}
          </span>
          <span className="mt-0.5 block text-[11.5px] leading-snug text-rose-600/90">
            {t("admin.evaluation.redFlagHelp")}
          </span>
        </span>
      </label>

      {s12.redFlag && (
        <div className="mt-2">
          <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
            {t("admin.evaluation.redFlagNotes")}
          </span>
          <Textarea
            rows={2}
            value={s12.redFlagNotes}
            onChange={(ev) =>
              onChange((prev) => ({
                ...prev,
                section12: { ...prev.section12, redFlagNotes: ev.target.value },
              }))
            }
          />
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
            {t("admin.evaluation.proposed")}
          </span>
          <Select
            className="h-9 w-full text-[12.5px]"
            value={s12.risk}
            onChange={(ev) =>
              onChange((prev) => ({
                ...prev,
                section12: { ...prev.section12, risk: ev.target.value as RiskLevel },
              }))
            }
          >
            {(["PENDIENTE", "BAJO", "MEDIO", "ALTO", "CRITICO"] as RiskLevel[]).map((r) => (
              <option key={r} value={r}>
                {levelLabel(t, r)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
            {t("admin.evaluation.triggersTitle")}
          </span>
          <div className="space-y-1">
            {!triggers.finance && !triggers.legal && !triggers.technology && (
              <p className="text-[12px] text-ink-muted">{t("admin.evaluation.noTriggers")}</p>
            )}
            {triggers.finance && <TriggerRow label={t("admin.evaluation.triggerFinance")} />}
            {triggers.legal && <TriggerRow label={t("admin.evaluation.triggerLegal")} />}
            {triggers.technology && <TriggerRow label={t("admin.evaluation.triggerTechnology")} />}
          </div>
        </div>
      </div>

      {triggers.requiresEscalation && (
        <p className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/60 px-3.5 py-2.5 text-[11.5px] font-medium text-amber-800">
          {t("admin.evaluation.escalation")}
        </p>
      )}
    </div>
  );
}

function TriggerRow({ label }: { label: string }) {
  return (
    <span className="flex items-start gap-2 rounded-lg border border-navy-800/10 bg-white px-2.5 py-1.5 text-[11.5px] text-ink">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
      <span>{label}</span>
    </span>
  );
}

function cnRow(idx: number): string {
  return `flex items-center gap-3 px-3 py-2.5 ${idx > 0 ? "border-t border-navy-800/5" : ""}`;
}
