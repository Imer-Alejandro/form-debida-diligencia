import { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import {
  createShareLink,
  filePath,
  getAccessToken,
  getItemIdByPath,
  OneDriveNotConfiguredError,
} from "@/lib/onedrive";
import { type DocumentRow } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { token, registrationId, ref, fileName, mimeType, size } = body ?? {};
  if (!token || !registrationId || !ref || !fileName) {
    return Response.json({ error: "bad_request" }, { status: 400 });
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
    const path = filePath(registrationId, ref, fileName);
    const itemId = await getItemIdByPath(accessToken, path);
    const url = await createShareLink(accessToken, itemId);

    const { data: doc, error } = await supabase
      .from("registration_documents")
      .insert({
        registration_id: registrationId,
        invitation_token: token,
        ref,
        file_name: fileName,
        file_size: typeof size === "number" ? size : null,
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