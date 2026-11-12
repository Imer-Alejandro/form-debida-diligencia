import { describe, expect, it } from "vitest";
import {
  getDepartmentSlaCompliance,
  getSlaDurationParts,
} from "./department-sla";

describe("getSlaDurationParts", () => {
  it("splits remaining time into days, hours, and minutes", () => {
    expect(getSlaDurationParts(90061)).toEqual({
      days: 1,
      hours: 1,
      minutes: 1,
    });
  });

  it("returns no duration for missing values and clamps expired time to zero", () => {
    expect(getSlaDurationParts(null)).toBeNull();
    expect(getSlaDurationParts(-1)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
    });
  });
});

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
