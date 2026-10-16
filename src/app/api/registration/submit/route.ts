import { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import { getAdminApi, isAdminApiConfigured } from "@/lib/supabase/admin";
import { submissionReceivedEmail, isMailConfigured, sendMail } from "@/lib/mail";
import { requiredDocumentRefs, type SupplierData } from "@/lib/types";

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

  // Policy: required documents (B–K, plus O for foreign and M for contractors)
  // must be checked before submitting.
  const requiredRefs = requiredDocumentRefs({
    providerType: data.section1.providerType,
    nationality: data.section1.nationality,
    isContractor: data.section1.isContractor,
  });
  const checkedSet = new Set(
    (data.section9.documents ?? []).filter((d) => d.checked).map((d) => d.ref)
  );
  const missingRequired = requiredRefs.filter((ref) => !checkedSet.has(ref));
  if (missingRequired.length > 0) {
    return Response.json(
      { error: "missing_required_documents", refs: missingRequired },
      { status: 422 }
    );
  }

  const supabase = createPublicClient();

  // Server-side check: every checked document must actually be uploaded, so the
  // supplier cannot submit while a reference is still pending.
  const checkedRefs = (data.section9.documents ?? [])
    .filter((d) => d.checked)
    .map((d) => d.ref);
  if (checkedRefs.length > 0) {
    const { data: docs } = await supabase.rpc("get_documents_for_token", {
      p_token: token,
    });
    const uploaded = new Set(
      (Array.isArray(docs) ? docs : docs ? [docs] : []).map(
        (d: { ref?: string }) => d.ref
      )
    );
    const missing = checkedRefs.filter((ref) => !uploaded.has(ref));
    if (missing.length > 0) {
      return Response.json(
        { error: "missing_documents", refs: missing },
        { status: 422 }
      );
    }
  }

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

  const reg = row as {
    company_name?: string | null;
    commercial_name?: string | null;
    reference_no?: string | null;
  } | null;

  const emailStatus = await notifySubmission({
    token,
    language: language === "en" ? "en" : "es",
    company: (reg?.company_name || reg?.commercial_name || data.section1.legalName || data.section1.commercialName || "").trim(),
    reference: reg?.reference_no ?? null,
  });

  return Response.json({ registration: row, emailStatus });
}

async function notifySubmission(args: {
  token: string;
  language: "es" | "en";
  company: string;
  reference: string | null;
}): Promise<"sent" | "failed" | "skipped"> {
  if (!args.company || !isMailConfigured() || !isAdminApiConfigured()) return "skipped";
  try {
    const admin = getAdminApi();
    const { data: inv } = await admin
      .from("invitations")
      .select("supplier_email")
      .eq("token", args.token)
      .maybeSingle();
    const to = inv?.supplier_email?.trim() ?? "";
    if (!to) return "skipped";
    const msg = submissionReceivedEmail(args.language, {
      company: args.company,
      reference: args.reference,
      appName: args.language === "en" ? "Due Diligence Form" : "Formulario de Debida Diligencia",
    });
    await sendMail({ ...msg, to });
    return "sent";
  } catch {
    return "failed";
  }
}

function validate(d: SupplierData): string | null {
  if (!d.section1.legalName?.trim()) return "section1.legalName";
  if (!d.section1.taxId?.trim()) return "section1.taxId";
  if (!d.section1.providerType) return "section1.providerType";
  if (d.section1.providerType === "juridica" && !d.section1.registryNo?.trim()) {
    return "section1.registryNo";
  }
  if (!d.section1.nationality) return "section1.nationality";
  if ((d.section10.authorizations?.length ?? 0) < 4) return "section10";
  if (!d.section11.signerName?.trim()) return "section11.signerName";
  if (!d.section11.signatureDataUrl) return "section11.signature";
  if (!d.section11.signatureConsent) return "section11.consent";
  return null;
}