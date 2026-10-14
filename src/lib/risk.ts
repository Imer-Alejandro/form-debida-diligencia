import type { RiskLevel } from "@/lib/types";

/** Risk categories from the corporate due-diligence policy. */
export type RiskCategoryId =
  | "financial"
  | "legal"
  | "reputational"
  | "operational"
  | "quality"
  | "commercial"
  | "safety"
  | "technology"
  | "supplyChain"
  | "environmental"
  | "conflictOfInterest"
  | "sbcHistory";

export interface RiskCategoryDef {
  id: RiskCategoryId;
  /** Optional categories may be left unrated (e.g. no history, or N/A). */
  optional: boolean;
}

/** Order follows the policy document. */
export const RISK_CATEGORIES: RiskCategoryDef[] = [
  { id: "financial", optional: false },
  { id: "legal", optional: false },
  { id: "reputational", optional: false },
  { id: "operational", optional: false },
  { id: "quality", optional: false },
  { id: "commercial", optional: false },
  { id: "safety", optional: false },
  { id: "technology", optional: false },
  { id: "supplyChain", optional: false },
  { id: "environmental", optional: true },
  { id: "conflictOfInterest", optional: false },
  { id: "sbcHistory", optional: true },
];

/** 1 = Bajo, 2 = Medio, 3 = Alto, 0 = sin clasificar. */
export type RiskRating = 0 | 1 | 2 | 3;
export type RiskRatings = Partial<Record<RiskCategoryId, RiskRating>>;

export type ComputedRiskLevel = "PENDIENTE" | "BAJO" | "MEDIO" | "ALTO";

export interface RiskResult {
  level: ComputedRiskLevel;
  average: number;
  max: number;
  redFlag: boolean;
  /** Categories evaluated (rating > 0). */
  rated: number;
}

const RANK: Record<ComputedRiskLevel, number> = {
  PENDIENTE: 0,
  BAJO: 1,
  MEDIO: 2,
  ALTO: 3,
};

function valueToLevel(v: number): ComputedRiskLevel {
  if (v >= 3) return "ALTO";
  if (v >= 2) return "MEDIO";
  if (v >= 1) return "BAJO";
  return "PENDIENTE";
}

/**
 * Global risk = average of the applicable categories (thresholds 1.5 / 2.5),
 * floored by the worst individual category ("regla de máximo"). A red flag /
 * critical finding forces ALTO regardless of the average.
 */
export function computeRisk(ratings: RiskRatings, redFlag: boolean): RiskResult {
  const values = RISK_CATEGORIES.map((c) => ratings[c.id] ?? 0).filter((v) => v > 0);

  if (redFlag) {
    return {
      level: "ALTO",
      average: values.length ? values.reduce<number>((a, b) => a + b, 0) / values.length : 0,
      max: values.length ? Math.max(...values) : 0,
      redFlag: true,
      rated: values.length,
    };
  }

  if (values.length === 0) {
    return { level: "PENDIENTE", average: 0, max: 0, redFlag: false, rated: 0 };
  }

  const average = values.reduce<number>((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const avgLevel: ComputedRiskLevel = average < 1.5 ? "BAJO" : average < 2.5 ? "MEDIO" : "ALTO";
  const maxLevel = valueToLevel(max);
  const level = RANK[avgLevel] >= RANK[maxLevel] ? avgLevel : maxLevel;

  return { level, average: Math.round(average * 100) / 100, max, redFlag: false, rated: values.length };
}

export interface RiskTriggers {
  finance: boolean;
  legal: boolean;
  technology: boolean;
  reasons: string[];
  requiresEscalation: boolean;
}

/** RD$1,000,000 — threshold above which Finance must validate. */
export const FINANCE_THRESHOLD_DOP = 1_000_000;

function parseAmount(raw: string): number {
  const n = Number(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Specialized validations required by the policy, plus whether the case must
 * be escalated to the Purchasing Management before contracting.
 */
export function evaluateTriggers(args: {
  ratings: RiskRatings;
  redFlag: boolean;
  estimatedAmount: string;
}): RiskTriggers {
  const amount = parseAmount(args.estimatedAmount);
  const financialHigh = (args.ratings.financial ?? 0) >= 3;
  const legalHigh = (args.ratings.legal ?? 0) >= 3;
  const conflict = (args.ratings.conflictOfInterest ?? 0) >= 2;
  const technology = (args.ratings.technology ?? 0) >= 2;

  const finance = amount >= FINANCE_THRESHOLD_DOP || financialHigh;
  const legal = args.redFlag || legalHigh || conflict;

  const reasons: string[] = [];
  if (amount >= FINANCE_THRESHOLD_DOP) reasons.push("monto");
  if (financialHigh) reasons.push("financiero");
  if (args.redFlag) reasons.push("bandera_roja");
  if (legalHigh) reasons.push("legal");
  if (conflict) reasons.push("conflicto_interes");
  if (technology) reasons.push("tecnologia");

  const result = computeRisk(args.ratings, args.redFlag);
  const requiresEscalation = result.level === "ALTO" || finance || legal || technology;

  return { finance, legal, technology, reasons, requiresEscalation };
}

/** Maps a computed level to the closest RiskLevel used across the app. */
export function toRiskLevel(level: ComputedRiskLevel): RiskLevel {
  return level;
}
