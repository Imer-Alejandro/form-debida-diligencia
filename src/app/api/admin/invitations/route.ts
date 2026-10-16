import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import { hasAnyRole, SUPPLIER_MANAGEMENT_ROLES } from "@/lib/access";
import { makeToken } from "@/lib/ids";
import { invitationEmail, sendMail } from "@/lib/mail";
import { resolveInvitationExpiry } from "@/lib/invitation-expiry";

export async function POST(req: Request) {
  const { supabase, user, role } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (!hasAnyRole(role, SUPPLIER_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    company?: string;
    email?: string;
    note?: string;
    language?: "es" | "en";
    expiresAt?: string | null;
  } | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const company = String(body.company ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const note = typeof body.note === "string" ? body.note : "";
  if (
    !company ||
    company.length > 200 ||
    email.length > 320 ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    note.length > 2000
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const token = makeToken();
  const language: "es" | "en" = body.language === "en" ? "en" : "es";
  const expiry = resolveInvitationExpiry(body.expiresAt);
  if (!expiry.ok) return NextResponse.json({ error: "invalid_expiry" }, { status: 400 });
  const expiresAt = expiry.expiresAt;

  const { data: inv, error } = await supabase
    .from("invitations")
    .insert({
      token,
      supplier_name: company,
      supplier_email: email || null,
      note,
      status: "sent",
      language,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select("id, token, created_at")
    .single();

  if (error || !inv) return NextResponse.json({ error: "db" }, { status: 500 });

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const link = `${base}/i/${inv.token}`;

  let emailStatus: "sent" | "failed" | "skipped" = "skipped";
  let mailError = "";
  if (email) {
    try {
      const msg = invitationEmail(language, {
        company,
        link,
        note,
        expiresAt,
        appName:
          language === "en" ? "Due Diligence Form" : "Formulario de Debida Diligencia",
      });
      await sendMail({ ...msg, to: email });
      emailStatus = "sent";
    } catch (e) {
      emailStatus = "failed";
      mailError = e instanceof Error ? e.message : "unknown";
    }
  }

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "INVITATION_CREATED",
    subject_type: "invitation",
    subject_id: inv.id,
    detail: { company, emailStatus },
  });

  return NextResponse.json({
    ok: true,
    token: inv.token,
    url: link,
    emailStatus,
    mailError: mailError || undefined,
  });
}

export async function DELETE(req: Request) {
  const { supabase, user, role } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (!hasAnyRole(role, SUPPLIER_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as { id?: string };
  const id = String(body.id ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data: invitation, error } = await supabase
    .from("invitations")
    .delete()
    .eq("id", id)
    .select("id, supplier_name")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  if (!invitation) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "INVITATION_DELETED",
    subject_type: "invitation",
    subject_id: invitation.id,
    detail: { company: invitation.supplier_name },
  });

  return NextResponse.json({ ok: true });
}