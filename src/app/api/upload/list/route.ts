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
  return Response.json({ documents: rows });
}