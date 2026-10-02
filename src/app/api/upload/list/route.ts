import { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import type { DocumentRow } from "@/lib/types";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return Response.json({ error: "bad_request" }, { status: 400 });

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_documents_for_token", {
    p_token: token,
  });
  if (error) {
    return Response.json({ error: "server_error", message: error.message }, { status: 500 });
  }
  const rows = (Array.isArray(data) ? data : data ? [data] : []) as DocumentRow[];

  // One document per ref: after a change request / resubmission the drive can
  // hold stale duplicates. Keep the newest attachment per ref so the old ones
  // never show up again in the form.
  const byRef = new Map<string, DocumentRow>();
  for (const row of rows) {
    const existing = byRef.get(row.ref);
    if (!existing || new Date(row.created_at) >= new Date(existing.created_at)) {
      byRef.set(row.ref, row);
    }
  }

  return Response.json({ documents: [...byRef.values()] });
}