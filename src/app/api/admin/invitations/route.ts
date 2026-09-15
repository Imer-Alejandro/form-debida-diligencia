import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import { makeToken } from "@/lib/ids";

export async function POST(req: Request) {
  const { supabase, user } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });

  const body = (await req.json()) as {
    company?: string;
    email?: string;
    note?: string;
    language?: "es" | "en";
    expiresAt?: string | null;
  };

  const company = String(body.company ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!company) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const token = makeToken();
  const expiresAt = body.expiresAt
    ? new Date(body.expiresAt).toISOString()
    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: inv, error } = await supabase
    .from("invitations")
    .insert({
      token,
      supplier_name: company,
      supplier_email: email || null,
      note: body.note ?? "",
      status: "sent",
      language: body.language === "en" ? "en" : "es",
      created_by: user.email ?? "",
      expires_at: expiresAt,
    })
    .select("id, token, created_at")
    .single();

  if (error || !inv) return NextResponse.json({ error: "db" }, { status: 500 });

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "INVITATION_CREATED",
    subject_type: "invitation",
    subject_id: inv.id,
    detail: { company },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return NextResponse.json({ ok: true, token: inv.token, url: `${base}/i/${inv.token}` });
}