import { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import {
  createUploadSession,
  getAccessToken,
  getSupplierNameForRegistration,
  OneDriveNotConfiguredError,
  supplierFilePath,
} from "@/lib/onedrive";
import {
  isAllowedExtension,
  isAllowedRef,
  maxBytesForRef,
} from "@/lib/upload-policy";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { token, registrationId, ref, fileName, size } = body ?? {};
  if (!token || !registrationId || !ref || !fileName) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (ref.length > 32 || fileName.length > 200 || !isAllowedRef(ref)) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!isAllowedExtension(fileName)) {
    return Response.json(
      { error: "unsupported_type", hint: "Tipo de archivo no permitido." },
      { status: 415 }
    );
  }
  if (typeof size === "number" && size > maxBytesForRef(ref)) {
    return Response.json({ error: "too_large" }, { status: 413 });
  }

  const supabase = createPublicClient();
  const { data: allowed } = await supabase.rpc("supplier_can_edit_registration", {
    p_token: token,
    p_registration_id: registrationId,
  });
  if (!allowed) {
    return Response.json(
      { error: "forbidden", hint: "La invitación no autoriza esta acción." },
      { status: 403 }
    );
  }

  try {
    const accessToken = await getAccessToken();
    const supplierName = await getSupplierNameForRegistration(token, registrationId);
    const path = supplierFilePath(supplierName, registrationId, ref, fileName);
    const session = await createUploadSession(accessToken, path);
    return Response.json({
      uploadUrl: session.uploadUrl,
      expirationDateTime: session.expirationDateTime,
      maxBytes: maxBytesForRef(ref),
    });
  } catch (err) {
    if (err instanceof OneDriveNotConfiguredError) {
      return Response.json({ error: "not_configured" }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "upload_session";
    return Response.json({ error: "server_error", message }, { status: 500 });
  }
}