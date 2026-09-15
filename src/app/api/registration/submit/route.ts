import { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { type SupplierData } from "@/lib/types";

export interface SubmitBody {
  token: string;
  data: SupplierData;
  language: string;
}

export async function POST(req: NextRequest) {
  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const { token, data, language } = body ?? {};
  if (!token || typeof token !== "string" || !data) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const problem = validate(data);
  if (problem) {
    return Response.json({ error: "validation", field: problem }, { status: 422 });
  }

  const supabase = createPublicClient();
  const { data: row, error } = await supabase.rpc("submit_registration", {
    p_token: token,
    p_data: data,
    p_language: language === "en" ? "en" : "es",
  });

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("invalid_token") || msg.includes("expired_token")) {
      return Response.json({ error: "invalid_token" }, { status: 403 });
    }
    if (msg.includes("already_submitted")) {
      return Response.json({ error: "already_submitted" }, { status: 409 });
    }
    return Response.json({ error: "server_error", message: error.message }, { status: 500 });
  }

  return Response.json({ registration: row });
}

function validate(d: SupplierData): string | null {
  if (!d.section1.legalName?.trim()) return "section1.legalName";
  if (!d.section1.taxId?.trim()) return "section1.taxId";
  if (!d.section1.providerType) return "section1.providerType";
  if ((d.section10.authorizations?.length ?? 0) < 4) return "section10";
  if (!d.section11.signerName?.trim()) return "section11.signerName";
  if (!d.section11.signatureDataUrl) return "section11.signature";
  if (!d.section11.signatureConsent) return "section11.consent";
  return null;
}