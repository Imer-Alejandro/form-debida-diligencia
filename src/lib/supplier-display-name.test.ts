import { describe, expect, it } from "vitest";
import { getSupplierDisplayName } from "./supplier-display-name";

describe("getSupplierDisplayName", () => {
  it("prefers the commercial name over the legal name", () => {
    expect(
      getSupplierDisplayName("Nombre comercial", "Razón social")
    ).toBe("Nombre comercial");
  });

  it("skips missing or blank names and uses the next available value", () => {
    expect(
      getSupplierDisplayName("  ", null, undefined, "  Nombre comercial  ", "Razón social")
    ).toBe("Nombre comercial");
    expect(getSupplierDisplayName(null, "", "Razón social")).toBe("Razón social");
    expect(getSupplierDisplayName(null, "   ")).toBe("");
  });
});
