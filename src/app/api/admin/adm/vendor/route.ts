import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import { deactivateVendorByTaxId, readAdmConfig } from "@/lib/adm";

export async function POST(req: Request) {
  const { supabase, user } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { data: reg, error } = await supabase
    .from("supplier_registrations")
    .select("id, tax_id")
    .eq("id", body.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const taxId = String(reg.tax_id ?? "").trim();
  if (!taxId) return NextResponse.json({ error: "no_tax_id" }, { status: 400 });

  const config = readAdmConfig();
  if (!config) return NextResponse.json({ error: "adm_not_configured" }, { status: 503 });

  try {
    const result = await deactivateVendorByTaxId(config, taxId);

    if (!result.ok) {
      await supabase.from("activity_log").insert({
        actor: user.email ?? "",
        action: "ADM_VENDOR_DEACTIVATE_NOT_FOUND",
        subject_type: "registration",
        subject_id: body.id,
      });
      return NextResponse.json({ error: "adm_not_found" }, { status: 404 });
    }

    await supabase.from("activity_log").insert({
      actor: user.email ?? "",
      action: "ADM_VENDOR_DEACTIVATED",
      subject_type: "registration",
      subject_id: body.id,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "adm_error" }, { status: 502 });
  }
}
