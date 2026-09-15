import { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import {
  createUploadSession,
  filePath,
  getAccessToken,
  OneDriveNotConfiguredError,
} from "@/lib/onedrive";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { token, registrationId, ref, fileName } = body ?? {};
  if (!token || !registrationId || !ref || !fileName) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (ref.length > 2 || fileName.length > 200) {
    return Response.json({ error: "bad_request" }, { status: 400 });
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
    const path = filePath(registrationId, ref, fileName);
    const session = await createUploadSession(accessToken, path);
    return Response.json({
      uploadUrl: session.uploadUrl,
      expirationDateTime: session.expirationDateTime,
      maxBytes: MAX_BYTES,
    });
  } catch (err) {
    if (err instanceof OneDriveNotConfiguredError) {
      return Response.json({ error: "not_configured" }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "upload_session";
    return Response.json({ error: "server_error", message }, { status: 500 });
  }
}