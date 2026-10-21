import { describe, expect, it } from "vitest";
import { getPortalLookupOutcome } from "./portal-lookup";

describe("getPortalLookupOutcome", () => {
  it("uses the result when the lookup succeeds", () => {
    expect(getPortalLookupOutcome(200, true)).toBe("found");
    expect(getPortalLookupOutcome(200, false)).toBe("not-found");
  });

  it("treats a missing record differently from a service failure", () => {
    expect(getPortalLookupOutcome(404, false)).toBe("not-found");
    expect(getPortalLookupOutcome(500, false)).toBe("service-error");
    expect(getPortalLookupOutcome(503, false)).toBe("service-error");
  });
});
