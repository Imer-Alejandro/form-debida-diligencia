import { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { type SupplierData } from "@/lib/types";

export interface DraftBody {
  token: string;
  data: SupplierData;
  language: string;
}

export async function POST(req: NextRequest) {
  let body: DraftBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const { token, data, language } = body ?? {};
  if (!token || typeof token !== "string" || !data) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = createPublicClient();
  const { data: row, error } = await supabase.rpc("save_registration_draft", {
    p_token: token,
    p_data: data,
    p_language: language === "en" ? "en" : "es",
  });

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("invalid_token") || msg.includes("expired_token")) {
      return Response.json({ error: "invalid_token" }, { status: 403 });
    }
    return Response.json({ error: "server_error", message: error.message }, { status: 500 });
  }

  return Response.json({ registration: row });
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return Response.json({ error: "bad_request" }, { status: 400 });

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_registration_for_token", {
    p_token: token,
  });
  if (error) {
    return Response.json({ error: "server_error", message: error.message }, { status: 500 });
  }
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const row = rows[0] ?? null;
  const editable =
    !!row && (row.status === "BORRADOR" || row.status === "SOLICITUD_CAMBIOS");
  return Response.json({ registration: row, editable });
}