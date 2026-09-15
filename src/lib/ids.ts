import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeToken(length = 32): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** Human-friendly reference number, e.g. SB-2026-0001 */
export function makeReferenceNo(seq: number): string {
  const year = new Date().getFullYear();
  return `SB-${year}-${String(seq % 100000).padStart(4, "0")}`;
}