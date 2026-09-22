import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import { getAdminApi } from "@/lib/supabase/admin";

export interface AdminUserRow {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignIn: string | null;
  confirmed: boolean;
}

export async function GET() {
  const { user } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });

  let admin;
  try {
    admin = getAdminApi();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  const rows: AdminUserRow[] = (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    createdAt: u.created_at ?? null,
    lastSignIn: u.last_sign_in_at ?? null,
    confirmed: Boolean(u.email_confirmed_at),
  }));

  return NextResponse.json({ ok: true, users: rows });
}

export async function POST(req: Request) {
  const { user } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });

  let admin;
  try {
    admin = getAdminApi();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const body = (await req.json()) as { email?: string; password?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return NextResponse.json({ error: "user_exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const api = getAdminApi();
  await api.from("activity_log").insert({
    actor: user.email ?? "",
    action: "ADMIN_USER_CREATED",
    subject_type: "auth_user",
    subject_id: data.user?.id ?? "",
    detail: { email },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: data.user?.id,
      email,
      createdAt: data.user?.created_at ?? null,
      lastSignIn: null,
      confirmed: true,
    } satisfies AdminUserRow,
  });
}

export async function DELETE(req: Request) {
  const { user } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });

  let admin;
  try {
    admin = getAdminApi();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const body = (await req.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (body.id === user.id) {
    return NextResponse.json({ error: "self_delete" }, { status: 400 });
  }

  const { error } = await admin.auth.admin.deleteUser(body.id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  const api = getAdminApi();
  await api.from("activity_log").insert({
    actor: user.email ?? "",
    action: "ADMIN_USER_DELETED",
    subject_type: "auth_user",
    subject_id: body.id,
  });

  return NextResponse.json({ ok: true });
}