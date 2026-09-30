import { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import {
  filePath,
  getAccessToken,
  getDriveContent,
  OneDriveNotConfiguredError,
  previousSupplierFilePath,
  supplierFilePath,
} from "@/lib/onedrive";
import {
  canPreview,
  fileExtension,
  PREVIEW_MAX_BYTES,
} from "@/lib/upload-policy";

const EXT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  txt: "text/plain",
  zip: "application/zip",
};

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/admin/doc/[registrationId]/[docId]">
) {
  const params = await ctx.params;
  const { registrationId, docId } = params;
  const isDownload = new URL(req.url).searchParams.get("dl") === "1";

  const { supabase, user } = await getAdminSession();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: doc } = await supabase
    .from("registration_documents")
    .select("id, registration_id, ref, file_name, file_size, mime_type")
    .eq("id", docId)
    .eq("registration_id", registrationId)
    .maybeSingle();

  if (!doc || !doc.file_name) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const ext = fileExtension(doc.file_name);
  const previewable = canPreview(doc.file_name, doc.file_size ?? 0);

  if (!isDownload) {
    if (!previewable) {
      return Response.json({ error: "not_previewable" }, { status: 415 });
    }
    if ((doc.file_size ?? 0) > PREVIEW_MAX_BYTES) {
      return Response.json({ error: "too_large" }, { status: 413 });
    }
  }

  let content: Response;
  try {
    const accessToken = await getAccessToken();
    const { data: registration } = await supabase
      .from("supplier_registrations")
      .select("company_name, data")
      .eq("id", doc.registration_id)
      .maybeSingle();
    const supplierName =
      registration?.company_name ??
      (typeof registration?.data?.section1?.legalName === "string"
        ? registration.data.section1.legalName
        : null);
    const paths = supplierName
      ? [
          supplierFilePath(
            supplierName,
            doc.registration_id,
            doc.ref,
            doc.file_name
          ),
          previousSupplierFilePath(
            supplierName,
            doc.registration_id,
            doc.ref,
            doc.file_name
          ),
          filePath(doc.registration_id, doc.ref, doc.file_name),
        ]
      : [filePath(doc.registration_id, doc.ref, doc.file_name)];
    content = await getDriveContent(accessToken, paths[0]);
    for (const path of paths.slice(1)) {
      if (content.status !== 404) break;
      content = await getDriveContent(accessToken, path);
    }
  } catch (err) {
    if (err instanceof OneDriveNotConfiguredError) {
      return Response.json(
        { error: "not_configured", hint: "La conexión con OneDrive no está configurada." },
        { status: 503 }
      );
    }
    return Response.json({ error: "gateway_error" }, { status: 502 });
  }

  if (content.status === 404) {
    return Response.json({ error: "not_found_in_drive" }, { status: 404 });
  }
  if (!content.ok) {
    return Response.json({ error: "drive_error" }, { status: 502 });
  }
  if (!content.body) {
    return Response.json({ error: "empty" }, { status: 502 });
  }

  const mime =
    doc.mime_type && (doc.mime_type.startsWith("image/") || doc.mime_type.startsWith("application/"))
      ? doc.mime_type
      : EXT_MIME[ext] ?? "application/octet-stream";

  const rawName = doc.file_name;
  const asciiName = rawName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const disposition = `${isDownload ? "attachment" : "inline"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(rawName)}`;

  const headers = new Headers();
  headers.set("Content-Type", mime);
  headers.set("Content-Disposition", disposition);
  headers.set("Cache-Control", "private, max-age=60");
  if (ext === "pdf") headers.set("X-Content-Type-Options", "nosniff");

  return new Response(content.body, { status: 200, headers });
}