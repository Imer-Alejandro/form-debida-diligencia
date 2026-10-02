import { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import {
  deleteFile,
  filePath,
  getAccessToken,
  getSupplierNameForRegistration,
  getItemIdByPath,
  ItemNotFoundError,
  previousSupplierFilePath,
  supplierFilePath,
} from "@/lib/onedrive";

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/upload/[id]">
) {
  const params = await ctx.params;
  const id = params.id;
  const token = new URL(req.url).searchParams.get("token");
  if (!id || !token) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = createPublicClient();
  const { data: row } = await supabase
    .from("registration_documents")
    .select("id, registration_id, ref, file_name")
    .eq("id", id)
    .eq("invitation_token", token)
    .maybeSingle();

  if (!row) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const { data: allowed } = await supabase.rpc("supplier_can_edit_registration", {
    p_token: token,
    p_registration_id: row.registration_id,
  });
  if (!allowed) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const { data: removed } = await supabase
      .from("registration_documents")
      .delete()
      .eq("id", id)
      .eq("invitation_token", token)
      .select("id, registration_id, ref, file_name");
    if (!removed || removed.length !== 1) {
      // RLS refused the delete (e.g. the registration token rotated since the
      // document was attached). Abort BEFORE touching the SharePoint file so a
      // record is never left pointing at an empty folder.
      return Response.json({ error: "not_found" }, { status: 404 });
    }
  } catch (err) {
    return Response.json(
      { error: "server_error", message: err instanceof Error ? err.message : "delete_failed" },
      { status: 500 }
    );
  }

  try {
    const accessToken = await getAccessToken();
    const supplierName = await getSupplierNameForRegistration(token, row.registration_id);
    let itemId: string | null = null;
    const paths = [
      supplierFilePath(supplierName, row.registration_id, row.ref, row.file_name),
      previousSupplierFilePath(supplierName, row.registration_id, row.ref, row.file_name),
      filePath(row.registration_id, row.ref, row.file_name),
    ];
    for (const path of paths) {
      try {
        itemId = await getItemIdByPath(accessToken, path);
        break;
      } catch (err) {
        if (!(err instanceof ItemNotFoundError)) throw err;
      }
    }
    if (itemId) await deleteFile(accessToken, itemId);
  } catch (err) {
    if (err instanceof ItemNotFoundError) {
      // The file is already gone (e.g. legacy naming or manual cleanup);
      // the database row was already removed, nothing else to do.
    } else {
      // The row is already gone; a leftover drive item would be unreachable via
      // the row, so treat storage errors as non-fatal.
    }
  }

  return Response.json({ ok: true });
}