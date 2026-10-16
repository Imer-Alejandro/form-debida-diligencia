export type InvitationExpiryResult =
  | { ok: true; expiresAt: string }
  | { ok: false };

const DEFAULT_INVITATION_DAYS = 90;

export function resolveInvitationExpiry(
  value: unknown,
  now = Date.now()
): InvitationExpiryResult {
  if (value === null || value === undefined || value === "") {
    return {
      ok: true,
      expiresAt: new Date(
        now + DEFAULT_INVITATION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  }
  if (typeof value !== "string") return { ok: false };
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp <= now) return { ok: false };
  return { ok: true, expiresAt: new Date(timestamp).toISOString() };
}
