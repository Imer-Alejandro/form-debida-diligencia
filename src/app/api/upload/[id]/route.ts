import { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import {
  deleteFile,
  filePath,
  getAccessToken,
  getSupplierNameForRegistration,
  getItemIdByPath,
  ItemNotFoundError,
  OneDriveNotConfiguredError,
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
    if (!itemId) throw new ItemNotFoundError();
    await deleteFile(accessToken, itemId);
  } catch (err) {
    if (err instanceof ItemNotFoundError) {
      // The file is already gone (e.g. legacy naming or manual cleanup).
      // Keep going and drop the database row.
    } else if (err instanceof OneDriveNotConfiguredError) {
      return Response.json(
        { error: "not_configured", hint: "La eliminación necesita la conexión a OneDrive." },
        { status: 503 }
      );
    } else {
      return Response.json(
        { error: "server_error", message: "No se pudo eliminar el archivo en SharePoint." },
        { status: 500 }
      );
    }
  }

  const { error } = await supabase
    .from("registration_documents")
    .delete()
    .eq("id", id)
    .eq("invitation_token", token);

  if (error) {
    return Response.json({ error: "server_error", message: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}