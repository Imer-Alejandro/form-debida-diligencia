import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/supabase/auth";
import { hasAnyRole } from "@/lib/access";
import { deactivateVendorByTaxId, readAdmConfig } from "@/lib/adm";

type AdmOutcome = "deactivated" | "not_found" | "skipped";

export async function POST(req: Request) {
  const { supabase, user, role } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (!hasAnyRole(role, ["ADMIN"])) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    deactivateAdm?: boolean;
  };
  if (!body.id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { data: reg, error } = await supabase
    .from("supplier_registrations")
    .select("id, reference_no, tax_id")
    .eq("id", body.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const deactivateAdm = body.deactivateAdm === true;
  let adm: AdmOutcome = "skipped";

  if (deactivateAdm) {
    const taxId = String(reg.tax_id ?? "").trim();
    if (!taxId) return NextResponse.json({ error: "no_tax_id" }, { status: 400 });

    const config = readAdmConfig();
    if (!config) return NextResponse.json({ error: "adm_not_configured" }, { status: 503 });

    try {
      const result = await deactivateVendorByTaxId(config, taxId);
      adm = result.ok ? "deactivated" : "not_found";
    } catch {
      return NextResponse.json({ error: "adm_delete_failed" }, { status: 502 });
    }
  }

  const { data: deleted, error: deleteError } = await supabase
    .from("supplier_registrations")
    .delete()
    .eq("id", body.id)
    .select("id");

  if (deleteError) return NextResponse.json({ error: "db" }, { status: 500 });
  if (!Array.isArray(deleted) || deleted.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "REGISTRATION_DELETED",
    subject_type: "registration",
    subject_id: body.id,
    detail: { reference_no: reg.reference_no, deactivate_adm: deactivateAdm, adm },
  });

  revalidatePath("/admin/suppliers");

  return NextResponse.json({ ok: true, adm });
}
