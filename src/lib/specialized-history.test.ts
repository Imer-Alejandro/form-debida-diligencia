import { describe, expect, it } from "vitest";
import type { SpecializedHistoryEntry } from "@/lib/types";
import { getSpecializedHistoryChanges } from "./specialized-history";

function entry(
  id: number,
  status: "PENDIENTE" | "APROBADA",
  notes = "",
  by = ""
): SpecializedHistoryEntry {
  return {
    id,
    created_at: `2026-10-${String(id).padStart(2, "0")}T12:00:00.000Z`,
    created_by_email: "admin@example.com",
    specialized: {
      finance: { status, notes, by, date: "" },
    },
    evaluation: null,
  };
}

describe("getSpecializedHistoryChanges", () => {
  it("returns the baseline and only snapshots that change the selected area", () => {
    const history = [
      entry(3, "APROBADA", "Validado", "Compras"),
      entry(2, "APROBADA", "Validado", "Compras"),
      entry(1, "PENDIENTE"),
    ];

    expect(
      getSpecializedHistoryChanges(history, "finance").map(({ entry: item, value, previous }) => ({
        id: item.id,
        status: value.status,
        previousStatus: previous?.status ?? null,
      }))
    ).toEqual([
      { id: 2, status: "APROBADA", previousStatus: "PENDIENTE" },
      { id: 1, status: "PENDIENTE", previousStatus: null },
    ]);
  });

  it("includes notes and responsible-person changes even when status is unchanged", () => {
    const history = [
      entry(2, "APROBADA", "Revisado", "Analista"),
      entry(1, "APROBADA", "Validado", "Compras"),
    ];

    expect(getSpecializedHistoryChanges(history, "finance")).toHaveLength(2);
  });

  it("uses the saved evaluation snapshot for legacy history rows", () => {
    const history: SpecializedHistoryEntry[] = [
      {
        id: 1,
        created_at: "2026-10-01T12:00:00.000Z",
        created_by_email: null,
        specialized: null,
        evaluation: {
          section12: {
            requestingCompany: "",
            requestingArea: "",
            purchaseCategory: "",
            estimatedAnnualAmount: "",
            risk: "PENDIENTE",
            reviewType: "INICIAL",
            riskCategories: {},
            redFlag: false,
            redFlagNotes: "",
            computedRisk: "PENDIENTE",
            specialized: {
              finance: {
                status: "APROBADA",
                notes: "Revisado",
                date: "2026-10-01",
                by: "Compras",
              },
              legal: { status: "NO_APLICA", notes: "", date: "", by: "" },
              technology: { status: "NO_APLICA", notes: "", date: "", by: "" },
            },
            checks: [],
          },
          section13: {
            decision: "PENDIENTE",
            conditions: "",
            purchaseLimits: "",
            nextRenewal: "",
            signatures: [],
          },
        },
      },
    ];

    expect(getSpecializedHistoryChanges(history, "finance")[0].value).toMatchObject({
      status: "APROBADA",
      notes: "Revisado",
    });
  });
});
