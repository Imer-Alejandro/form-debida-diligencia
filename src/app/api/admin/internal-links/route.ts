import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import { hasAnyRole, SUPPLIER_MANAGEMENT_ROLES, SUPPLIER_READ_ROLES } from "@/lib/access";
import { makeToken } from "@/lib/ids";
import { internalLinkPath, normalizeInternalKind } from "@/lib/process";

export async function GET(req: Request) {
  const { supabase, user, role } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (!hasAnyRole(role, SUPPLIER_READ_ROLES)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const registrationId = new URL(req.url).searchParams.get("registrationId");
  if (!registrationId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const [tokens, services, incidents] = await Promise.all([
    supabase
      .from("internal_access_tokens")
      .select("id, kind, area, recipient, status, token, expires_at, used_at, created_at")
      .eq("registration_id", registrationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("service_evaluations")
      .select("*")
      .eq("registration_id", registrationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("supplier_incidents")
      .select("*")
      .eq("registration_id", registrationId)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    tokens: tokens.data ?? [],
    serviceEvaluations: services.data ?? [],
    incidents: incidents.data ?? [],
  });
}

export async function POST(req: Request) {
  const { supabase, user, role } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (!hasAnyRole(role, SUPPLIER_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    registrationId?: string;
    kind?: string;
    area?: string;
    recipient?: string;
    expiresInDays?: number;
  } | null;

  const kind = normalizeInternalKind(body?.kind);
  if (!body?.registrationId || !kind) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const days =
    typeof body.expiresInDays === "number" && body.expiresInDays > 0
      ? Math.min(Math.floor(body.expiresInDays), 365)
      : 30;
  const token = makeToken();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("internal_access_tokens")
    .insert({
      registration_id: body.registrationId,
      kind,
      area: body.area?.trim() || null,
      recipient: body.recipient?.trim() || null,
      token,
      expires_at: expiresAt,
      created_by: user.id,
    })
    .select("id, token")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "db", message: error?.message }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "INTERNAL_LINK_CREATED",
    subject_type: "registration",
    subject_id: body.registrationId,
    detail: { kind, area: body.area ?? null },
  });

  return NextResponse.json({
    ok: true,
    id: data.id,
    token: data.token,
    path: internalLinkPath(data.token),
    expiresAt,
  });
}
