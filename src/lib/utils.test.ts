import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./utils";

describe("date formatting", () => {
  it("formats timestamp dates in the application time zone", () => {
    expect(formatDate("2026-01-01T02:00:00.000Z", "en-US")).toBe(
      "Dec 31, 2025"
    );
  });

  it("preserves date-only values in the application time zone", () => {
    expect(formatDate("2026-01-01", "en-US")).toBe("Jan 1, 2026");
  });

  it("formats date and time deterministically", () => {
    expect(formatDateTime("2026-01-01T02:00:00.000Z", "en-US")).toBe(
      "Dec 31, 2025 · 10:00 PM"
    );
  });
});
