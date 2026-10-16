import { describe, expect, it } from "vitest";
import { resolveInvitationExpiry } from "@/lib/invitation-expiry";

describe("resolveInvitationExpiry", () => {
  const now = Date.parse("2026-05-01T12:00:00.000Z");

  it("uses a 90-day expiry when no date is provided", () => {
    expect(resolveInvitationExpiry(null, now)).toEqual({
      ok: true,
      expiresAt: "2026-07-30T12:00:00.000Z",
    });
  });

  it("accepts and normalizes a future date", () => {
    expect(resolveInvitationExpiry("2026-05-02T00:00:00-04:00", now)).toEqual({
      ok: true,
      expiresAt: "2026-05-02T04:00:00.000Z",
    });
  });

  it("rejects invalid and past dates", () => {
    expect(resolveInvitationExpiry("not-a-date", now)).toEqual({ ok: false });
    expect(resolveInvitationExpiry("2026-05-01T12:00:00Z", now)).toEqual({
      ok: false,
    });
    expect(resolveInvitationExpiry("2026-04-30T12:00:00Z", now)).toEqual({
      ok: false,
    });
  });
});
