import crypto from "crypto";

const ALGO = "aes-256-gcm";

function keyBytes(): Buffer {
  const secret = process.env.ONEDRIVE_CONFIG_SECRET;
  if (!secret) {
    throw new Error("ONEDRIVE_CONFIG_SECRET is not configured");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string): string {
  if (!value) throw new Error("Empty value");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: enc.toString("base64"),
  });
}

export function decryptSecret(payload: string): string {
  const parsed = JSON.parse(payload);
  const iv = Buffer.from(parsed.iv, "base64");
  const tag = Buffer.from(parsed.tag, "base64");
  const data = Buffer.from(parsed.data, "base64");
  const decipher = crypto.createDecipheriv(ALGO, keyBytes(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}