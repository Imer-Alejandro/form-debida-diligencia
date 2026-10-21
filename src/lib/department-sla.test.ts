import { describe, expect, it } from "vitest";
import { getDepartmentSlaCompliance } from "./department-sla";

describe("getDepartmentSlaCompliance", () => {
  const dueAt = "2026-10-21T12:00:00.000Z";

  it("marks a response before the deadline as on time", () => {
    expect(
      getDepartmentSlaCompliance(dueAt, "2026-10-21T11:59:59.000Z")
    ).toBe("ON_TIME");
  });

  it("considers a response exactly at the deadline on time", () => {
    expect(getDepartmentSlaCompliance(dueAt, dueAt)).toBe("ON_TIME");
  });

  it("marks a response after the deadline as late", () => {
    expect(
      getDepartmentSlaCompliance(dueAt, "2026-10-21T12:00:01.000Z")
    ).toBe("LATE");
  });

  it("returns unknown when timestamps are missing or invalid", () => {
    expect(getDepartmentSlaCompliance(null, dueAt)).toBe("UNKNOWN");
    expect(getDepartmentSlaCompliance(dueAt, null)).toBe("UNKNOWN");
    expect(getDepartmentSlaCompliance("invalid", dueAt)).toBe("UNKNOWN");
  });
});
