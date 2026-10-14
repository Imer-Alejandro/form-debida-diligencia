import type { DocumentRow } from "@/lib/types";

export interface UploadDocumentParams {
  token: string;
  registrationId: string;
  ref: string;
  file: File;
  onProgress?: (percent: number) => void;
}

const CHUNK_SIZE = 10 * 1024 * 1024;

/**
 * Uploads a single document to the supplier's OneDrive folder using a chunked
 * upload session, reporting progress (0-100) so the UI can give the supplier
 * live feedback while the file is processed.
 */
export async function uploadDocument({
  token,
  registrationId,
  ref,
  file,
  onProgress,
}: UploadDocumentParams): Promise<DocumentRow> {
  const sessionRes = await fetch("/api/upload/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      registrationId,
      ref,
      fileName: file.name,
      size: file.size,
    }),
  });
  const session = await sessionRes.json().catch(() => null);
  if (!sessionRes.ok || !session?.uploadUrl) {
    throw new Error(
      session?.message || session?.hint || session?.error || `upload_session_${sessionRes.status}`
    );
  }

  for (let start = 0; start < file.size; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    await putChunk(
      session.uploadUrl as string,
      file.slice(start, end),
      file.type || "application/octet-stream",
      start,
      end,
      file.size,
      (loadedInChunk) => {
        onProgress?.(Math.min(99, Math.round(((start + loadedInChunk) / file.size) * 100)));
      }
    );
  }

  const finalizeRes = await fetch("/api/upload/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      registrationId,
      ref,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    }),
  });
  const finalized = await finalizeRes.json().catch(() => null);
  if (!finalizeRes.ok || !finalized?.doc) {
    throw new Error(
      finalized?.message || finalized?.hint || finalized?.error || `upload_finalize_${finalizeRes.status}`
    );
  }

  onProgress?.(100);
  return finalized.doc as DocumentRow;
}

function putChunk(
  url: string,
  blob: Blob,
  contentType: string,
  start: number,
  end: number,
  total: number,
  onChunkProgress: (loadedInChunk: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("Content-Range", `bytes ${start}-${end - 1}/${total}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onChunkProgress(event.loaded);
    };
    xhr.onload = () => {
      const isLastChunk = end === total;
      const ok = isLastChunk
        ? xhr.status === 200 || xhr.status === 201
        : xhr.status === 202;
      if (ok) resolve();
      else reject(new Error(`sharepoint_upload_${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("sharepoint_upload_network"));
    xhr.send(blob);
  });
}
