import { describe, expect, it } from "vitest";
import {
  bandForAverage,
  criteriaForDepartment,
  isValidScore,
  summarizeScores,
} from "./department-criteria";

describe("criteriaForDepartment", () => {
  it("returns fixed criteria for known departments", () => {
    expect(criteriaForDepartment("FINANCE")).toHaveLength(5);
    expect(criteriaForDepartment("legal")).toHaveLength(5);
    expect(criteriaForDepartment("TECHNOLOGY")).toHaveLength(5);
    expect(criteriaForDepartment("TECHNICAL")).toHaveLength(5);
  });

  it("returns an empty list for unknown or missing departments", () => {
    expect(criteriaForDepartment(null)).toEqual([]);
    expect(criteriaForDepartment("UNKNOWN")).toEqual([]);
  });
});

describe("isValidScore", () => {
  it("accepts integers from 1 to 5 only", () => {
    expect(isValidScore(1)).toBe(true);
    expect(isValidScore(5)).toBe(true);
    expect(isValidScore(3.5)).toBe(false);
    expect(isValidScore(0)).toBe(false);
    expect(isValidScore(6)).toBe(false);
    expect(isValidScore("4")).toBe(false);
    expect(isValidScore(null)).toBe(false);
  });
});

describe("summarizeScores", () => {
  it("averages every valid score (weighted by criterion)", () => {
    const summary = summarizeScores("TECHNICAL", {
      product_quality: 5,
      capacity: 4,
      specifications: 3,
      certifications: 4,
      lead_times: 4,
    });
    expect(summary).not.toBeNull();
    expect(summary?.average).toBe(4.08);
    expect(summary?.band).toBe("POSITIVE");
  });

  it("weights criteria flagged with a weight", () => {
    const summary = summarizeScores("TECHNICAL", {
      product_quality: 5,
      capacity: 1,
    });
    expect(summary?.average).toBe(3);
    expect(summary?.band).toBe("NEUTRAL");
  });

  it("ignores unknown keys and invalid values", () => {
    const summary = summarizeScores("TECHNICAL", {
      product_quality: 4,
      unknown: 5,
      lead_times: 9,
    });
    expect(summary?.average).toBe(4);
  });

  it("returns null when there is nothing to average", () => {
    expect(summarizeScores("TECHNICAL", {})).toBeNull();
    expect(summarizeScores("TECHNICAL", null)).toBeNull();
    expect(summarizeScores("TECHNICAL", { lead_times: 99 })).toBeNull();
  });

  it("falls back to any valid keys when the department is unknown", () => {
    const summary = summarizeScores("UNKNOWN", { a: 2, b: 4 });
    expect(summary?.average).toBe(3);
    expect(summary?.band).toBe("NEUTRAL");
  });
});

describe("bandForAverage", () => {
  it("maps averages to bands", () => {
    expect(bandForAverage(4)).toBe("POSITIVE");
    expect(bandForAverage(4.5)).toBe("POSITIVE");
    expect(bandForAverage(3)).toBe("NEUTRAL");
    expect(bandForAverage(2.99)).toBe("NEGATIVE");
    expect(bandForAverage(1)).toBe("NEGATIVE");
  });
});
