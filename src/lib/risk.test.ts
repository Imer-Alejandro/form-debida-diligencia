import { describe, expect, it } from "vitest";
import {
  FINANCE_THRESHOLD_DOP,
  RISK_CATEGORIES,
  computeRisk,
  evaluateTriggers,
  toRiskLevel,
  type RiskRatings,
} from "@/lib/risk";

const allRated = (rating: number): RiskRatings =>
  Object.fromEntries(RISK_CATEGORIES.map((c) => [c.id, rating])) as RiskRatings;

describe("computeRisk", () => {
  it("returns PENDIENTE when nothing is rated", () => {
    const r = computeRisk({}, false);
    expect(r.level).toBe("PENDIENTE");
    expect(r.rated).toBe(0);
    expect(r.average).toBe(0);
  });

  it("ignores unrated optional categories", () => {
    const r = computeRisk({ financial: 1, legal: 1 }, false);
    expect(r.rated).toBe(2);
    expect(r.level).toBe("BAJO");
  });

  it("classifies a low average as BAJO", () => {
    expect(computeRisk(allRated(1), false).level).toBe("BAJO");
  });

  it("classifies an average between 1.5 and 2.5 as MEDIO", () => {
    expect(computeRisk(allRated(2), false).level).toBe("MEDIO");
  });

  it("floors the level with the worst category (regla de máximo)", () => {
    const ratings: RiskRatings = { ...allRated(1), financial: 3 };
    const r = computeRisk(ratings, false);
    expect(r.average).toBeLessThan(1.5);
    expect(r.max).toBe(3);
    expect(r.level).toBe("ALTO");
  });

  it("forces ALTO on a red flag regardless of ratings", () => {
    const r = computeRisk(allRated(1), true);
    expect(r.level).toBe("ALTO");
    expect(r.redFlag).toBe(true);
  });

  it("forces ALTO on a red flag even with no ratings", () => {
    expect(computeRisk({}, true).level).toBe("ALTO");
  });
});

describe("evaluateTriggers", () => {
  it("triggers finance when the amount reaches the threshold", () => {
    const t = evaluateTriggers({
      ratings: {},
      redFlag: false,
      estimatedAmount: "RD$1,000,000",
    });
    expect(t.finance).toBe(true);
    expect(t.reasons).toContain("monto");
  });

  it("does not trigger finance below the threshold", () => {
    const t = evaluateTriggers({ ratings: {}, redFlag: false, estimatedAmount: "500,000" });
    expect(t.finance).toBe(false);
  });

  it("triggers finance on a high financial rating", () => {
    const t = evaluateTriggers({ ratings: { financial: 3 }, redFlag: false, estimatedAmount: "" });
    expect(t.finance).toBe(true);
    expect(t.reasons).toContain("financiero");
  });

  it("triggers legal on a red flag, high legal rating or conflict of interest", () => {
    expect(evaluateTriggers({ ratings: {}, redFlag: true, estimatedAmount: "" }).legal).toBe(true);
    expect(
      evaluateTriggers({ ratings: { legal: 3 }, redFlag: false, estimatedAmount: "" }).legal
    ).toBe(true);
    expect(
      evaluateTriggers({ ratings: { conflictOfInterest: 2 }, redFlag: false, estimatedAmount: "" })
        .legal
    ).toBe(true);
  });

  it("triggers technology when the rating is medium or higher", () => {
    expect(
      evaluateTriggers({ ratings: { technology: 2 }, redFlag: false, estimatedAmount: "" }).technology
    ).toBe(true);
    expect(
      evaluateTriggers({ ratings: { technology: 1 }, redFlag: false, estimatedAmount: "" }).technology
    ).toBe(false);
  });

  it("requires escalation when the computed risk is ALTO", () => {
    const t = evaluateTriggers({ ratings: allRated(3), redFlag: false, estimatedAmount: "" });
    expect(t.requiresEscalation).toBe(true);
  });

  it("keeps FINANCE_THRESHOLD_DOP aligned with the policy", () => {
    expect(FINANCE_THRESHOLD_DOP).toBe(1_000_000);
  });

  it("passes the computed level through toRiskLevel", () => {
    expect(toRiskLevel("ALTO")).toBe("ALTO");
  });
});
