import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/supabase/auth";
import { makeToken } from "@/lib/ids";
import { requestChangesEmail, sendMail } from "@/lib/mail";

export async function POST(req: Request) {
  const { supabase, user } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });

  const body = (await req.json()) as { id?: string; note?: string };
  if (!body.id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const note = String(body.note ?? "").trim();

  const { data: reg } = await supabase
    .from("supplier_registrations")
    .select("id, invitation_id, company_name")
    .eq("id", body.id)
    .maybeSingle();

  if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: oldInv } = reg.invitation_id
    ? await supabase
        .from("invitations")
        .select("supplier_email, supplier_name, language")
        .eq("id", reg.invitation_id)
        .maybeSingle()
    : { data: null };

  const supplierEmail = oldInv?.supplier_email?.trim() ?? "";
  const language: "es" | "en" = oldInv?.language === "en" ? "en" : "es";

  const token = makeToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const url = `${base}/i/${token}`;

  const { data: inv, error: invErr } = await supabase
    .from("invitations")
    .insert({
      token,
      supplier_email: supplierEmail,
      supplier_name: oldInv?.supplier_name ?? reg.company_name ?? "",
      note: note || "Solicitud de cambios: revise la información señalada y vuelva a enviar el formulario.",
      status: "sent",
      language,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (invErr || !inv) return NextResponse.json({ error: "db" }, { status: 500 });

  const { error } = await supabase
    .from("supplier_registrations")
    .update({
      status: "SOLICITUD_CAMBIOS",
      invitation_token: token,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  let emailStatus: "sent" | "failed" | "skipped" = "skipped";
  let mailError = "";
  if (supplierEmail) {
    try {
      const msg = requestChangesEmail(language, {
        company:
          oldInv?.supplier_name ?? reg.company_name ?? "proveedor",
        link: url,
        note,
        expiresAt,
        appName:
          language === "en" ? "Due Diligence Form" : "Formulario de Debida Diligencia",
      });
      await sendMail({ ...msg, to: supplierEmail });
      emailStatus = "sent";
    } catch (e) {
      emailStatus = "failed";
      mailError = e instanceof Error ? e.message : "unknown";
    }
  }

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "CHANGES_REQUESTED",
    subject_type: "registration",
    subject_id: body.id,
    detail: { note, emailStatus, to: supplierEmail },
  });

  revalidatePath(`/admin/suppliers/${body.id}`);
  return NextResponse.json({ ok: true, url, emailStatus, mailError: mailError || undefined });
}