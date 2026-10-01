// Shared (client-safe) upload policy for supplier documents.
// Imported by API routes, the SharePoint layer and the wizard UI.

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

/** Documents larger than this are offered as download-only (no inline preview). */
export const PREVIEW_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Special document ref used to persist the supplier's signature image. */
export const SIGNATURE_REF = "FIRMA";

/** Signature images are small by nature; keep them reasonable. */
export const SIGNATURE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const PREVIEWABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  "pdf",
  "png", "jpg", "jpeg", "gif", "webp", "bmp",
]);

export const DOC_REF_ALLOWLIST: ReadonlySet<string> = new Set([
  "A", "B", "C", "D", "E", "F", "G", "H",
  "I", "J", "K", "L", "M", "N", "O", "P",
  SIGNATURE_REF,
]);

export const ALLOWED_DOC_EXTENSIONS: ReadonlySet<string> = new Set([
  "pdf",
  "png", "jpg", "jpeg", "gif", "webp", "bmp",
  "doc", "docx", "odt",
  "xls", "xlsx", "ods", "csv",
  "ppt", "pptx", "odp",
  "txt", "rtf", "zip",
]);

export function isAllowedRef(ref: string): boolean {
  return DOC_REF_ALLOWLIST.has(ref);
}

/** Size limit for a given ref (signature images are capped lower). */
export function maxBytesForRef(ref: string): number {
  return ref === SIGNATURE_REF ? SIGNATURE_MAX_BYTES : MAX_UPLOAD_BYTES;
}

/** Lowercased extension without the dot, or "" when there is none. */
export function fileExtension(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  if (i < 0 || i === fileName.length - 1) return "";
  return fileName.slice(i + 1).toLowerCase();
}

export function isAllowedExtension(fileName: string): boolean {
  return ALLOWED_DOC_EXTENSIONS.has(fileExtension(fileName));
}

/** Sanitizes characters that Graph / Windows reject in file names. */
export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ");
}

export type FileValidationError = "too_large" | "unsupported_type" | null;

export function validateFile(file: { name: string; size: number }): FileValidationError {
  if (file.size > MAX_UPLOAD_BYTES) return "too_large";
  if (!isAllowedExtension(file.name)) return "unsupported_type";
  return null;
}

/** Whether a stored document can be shown inline by the admin proxy. */
export function canPreview(fileName: string, size: number): boolean {
  return PREVIEWABLE_EXTENSIONS.has(fileExtension(fileName)) && size <= PREVIEW_MAX_BYTES;
}