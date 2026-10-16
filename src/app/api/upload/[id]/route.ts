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
  const { data: removed, error: removeError } = await supabase.rpc(
    "delete_registration_document",
    { p_token: token, p_document_id: id }
  );
  const row = Array.isArray(removed) ? removed[0] : removed;
  if (removeError) {
    if (removeError.code === "42501") {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    console.error("Could not remove supplier document:", removeError.message);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });

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