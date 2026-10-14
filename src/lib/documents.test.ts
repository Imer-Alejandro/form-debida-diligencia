import { describe, expect, it } from "vitest";
import { documentApplies, requiredDocumentRefs } from "@/lib/types";

describe("documentApplies", () => {
  it("always applies for 'todos'", () => {
    expect(documentApplies("todos", {})).toBe(true);
  });

  it("applies juridica items only to legal entities", () => {
    expect(documentApplies("juridica", { providerType: "juridica" })).toBe(true);
    expect(documentApplies("juridica", { providerType: "natural" })).toBe(false);
  });

  it("applies contractor items only to contractors", () => {
    expect(documentApplies("contratista", { isContractor: "si" })).toBe(true);
    expect(documentApplies("contratista", { isContractor: "no" })).toBe(false);
  });

  it("detects foreign suppliers by ISO code or name", () => {
    expect(documentApplies("extranjero", { nationality: "US" })).toBe(true);
    expect(documentApplies("extranjero", { nationality: "Estados Unidos" })).toBe(true);
    expect(documentApplies("extranjero", { nationality: "DO" })).toBe(false);
    expect(documentApplies("extranjero", { nationality: "" })).toBe(false);
    expect(documentApplies("nacionales", { nationality: "DO" })).toBe(true);
    expect(documentApplies("nacionales", { nationality: "US" })).toBe(false);
  });
});

describe("requiredDocumentRefs", () => {
  it("lists required docs for a national legal entity", () => {
    const refs = requiredDocumentRefs({
      providerType: "juridica",
      nationality: "DO",
      isContractor: "no",
    });
    expect(refs).toEqual(expect.arrayContaining(["A", "B", "C", "D", "E", "F", "G", "I", "J", "K"]));
    expect(refs).not.toContain("M");
    expect(refs).not.toContain("O");
    expect(refs).not.toContain("H");
  });

  it("excludes juridica items for natural persons", () => {
    const refs = requiredDocumentRefs({ providerType: "natural", nationality: "DO" });
    expect(refs).toContain("A");
    expect(refs).not.toContain("D");
  });

  it("requires equivalent docs for foreign suppliers", () => {
    const refs = requiredDocumentRefs({ providerType: "natural", nationality: "US" });
    expect(refs).toContain("O");
    expect(refs).not.toContain("C");
  });

  it("adds the insurance policy only for contractors", () => {
    expect(requiredDocumentRefs({ providerType: "natural", nationality: "DO", isContractor: "si" })).toContain(
      "M"
    );
  });

  it("never lists optional documents", () => {
    const refs = requiredDocumentRefs({
      providerType: "juridica",
      nationality: "US",
      isContractor: "si",
    });
    for (const optional of ["H", "L", "N", "P"]) {
      expect(refs).not.toContain(optional);
    }
  });
});
