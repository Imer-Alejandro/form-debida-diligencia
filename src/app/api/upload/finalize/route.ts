import { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import {
  createShareLink,
  deleteFile,
  getAccessToken,
  getSupplierNameForRegistration,
  getItemIdByPath,
  getItemSize,
  getItemWebUrl,
  OneDriveNotConfiguredError,
  supplierFilePath,
} from "@/lib/onedrive";
import {
  isAllowedExtension,
  isAllowedRef,
  MAX_UPLOAD_BYTES,
} from "@/lib/upload-policy";
import { type DocumentRow } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { token, registrationId, ref, fileName, mimeType } = body ?? {};
  if (!token || !registrationId || !ref || !fileName) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (ref.length > 2 || fileName.length > 200 || !isAllowedRef(ref)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!isAllowedExtension(fileName)) {
    return Response.json(
      { error: "unsupported_type", hint: "Tipo de archivo no permitido." },
      { status: 415 }
    );
  }

  const supabase = createPublicClient();
  const { data: allowed } = await supabase.rpc("supplier_can_edit_registration", {
    p_token: token,
    p_registration_id: registrationId,
  });
  if (!allowed) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const accessToken = await getAccessToken();
    const supplierName = await getSupplierNameForRegistration(token, registrationId);
    const path = supplierFilePath(supplierName, registrationId, ref, fileName);
    const itemId = await getItemIdByPath(accessToken, path);

    // Server-side enforcement: verify the *real* size reported by SharePoint,
    // not the client-claimed one.
    const realSize = await getItemSize(accessToken, itemId);
    if (realSize > MAX_UPLOAD_BYTES) {
      try {
        await deleteFile(accessToken, itemId);
      } catch {
        /* file already gone or unlucky race; the row won't be created either way */
      }
      return Response.json({ error: "too_large" }, { status: 413 });
    }

    let url: string;
    try {
      url = await createShareLink(accessToken, itemId);
    } catch (err) {
      try {
        url = await getItemWebUrl(accessToken, itemId);
      } catch (fallbackError) {
        const message = fallbackError instanceof Error
          ? fallbackError.message
          : err instanceof Error
            ? err.message
            : "Share link error";
        return Response.json(
          { error: "share_link_unavailable", message },
          { status: 502 }
        );
      }
    }

    const { data: doc, error } = await supabase
      .from("registration_documents")
      .insert({
        registration_id: registrationId,
        invitation_token: token,
        ref,
        file_name: fileName,
        file_size: realSize,
        mime_type: typeof mimeType === "string" ? mimeType : null,
        url,
      })
      .select()
      .single();

    if (error) {
      return Response.json(
        { error: "server_error", message: error.message },
        { status: 500 }
      );
    }
    return Response.json({ doc: doc as DocumentRow });
  } catch (err) {
    if (err instanceof OneDriveNotConfiguredError) {
      return Response.json({ error: "not_configured" }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "finalize_error";
    return Response.json({ error: "server_error", message }, { status: 500 });
  }
}