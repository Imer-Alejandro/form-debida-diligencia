import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import { hasAnyRole, SUPPLIER_MANAGEMENT_ROLES } from "@/lib/access";
import {
  invitationEmail,
  isMailConfigured,
  requestChangesEmail,
  sendMail,
} from "@/lib/mail";

export async function POST(req: Request) {
  const { supabase, user, role } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (!hasAnyRole(role, SUPPLIER_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("id, token, supplier_name, supplier_email, note, language, status, expires_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  if (!invitation) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!invitation.supplier_email?.trim()) {
    return NextResponse.json({ error: "no_email" }, { status: 422 });
  }
  if (invitation.status === "completed") {
    return NextResponse.json({ error: "already_completed" }, { status: 409 });
  }
  if (invitation.expires_at && new Date(invitation.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }
  if (!isMailConfigured()) {
    return NextResponse.json({ error: "mail_not_configured" }, { status: 503 });
  }

  const { data: registration, error: registrationError } = await supabase
    .from("supplier_registrations")
    .select("status")
    .eq("invitation_token", invitation.token)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (registrationError) {
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const language: "es" | "en" = invitation.language === "en" ? "en" : "es";
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
  const link = `${base}/i/${invitation.token}`;
  const args = {
    company: invitation.supplier_name || "proveedor",
    link,
    note: invitation.note ?? "",
    expiresAt: invitation.expires_at,
    appName:
      language === "en" ? "Due Diligence Form" : "Formulario de Debida Diligencia",
  };
  const message =
    registration?.status === "SOLICITUD_CAMBIOS"
      ? requestChangesEmail(language, args)
      : invitationEmail(language, args);

  try {
    await sendMail({ ...message, to: invitation.supplier_email.trim() });
  } catch (sendError) {
    console.error("Could not resend supplier invitation", sendError);
    return NextResponse.json({ error: "mail_failed" }, { status: 502 });
  }

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "INVITATION_RESENT",
    subject_type: "invitation",
    subject_id: invitation.id,
    detail: { email: invitation.supplier_email },
  });

  return NextResponse.json({ ok: true });
}
