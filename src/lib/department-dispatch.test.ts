import { describe, expect, it } from "vitest";
import { getDepartmentReviewIdsToDispatch } from "./department-dispatch";

describe("getDepartmentReviewIdsToDispatch", () => {
  it("includes departments triggered automatically by risk", () => {
    expect(
      getDepartmentReviewIdsToDispatch([], {
        finance: true,
        legal: false,
        technology: true,
      })
    ).toEqual(["FINANCE", "TECHNOLOGY"]);
  });

  it("combines manually selected and risk-triggered departments without duplicates", () => {
    expect(
      getDepartmentReviewIdsToDispatch(["LEGAL", "FINANCE", "CUSTOM"], {
        finance: true,
        legal: false,
        technology: true,
      })
    ).toEqual(["LEGAL", "FINANCE", "CUSTOM", "TECHNOLOGY"]);
  });
});
