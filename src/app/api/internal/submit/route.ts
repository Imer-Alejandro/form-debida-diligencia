import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";
import {
  normalizeInternalKind,
  validateIncidentForm,
  validateServiceForm,
} from "@/lib/process";

type Context = { kind?: string; status?: string };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    token?: string;
    data?: Record<string, unknown>;
  } | null;
  if (!body?.token || !body.data) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = createPublicClient();

  const { data: access, error: ctxErr } = await supabase.rpc(
    "get_internal_access_for_token",
    { p_token: body.token }
  );
  if (ctxErr) return NextResponse.json({ error: "db" }, { status: 500 });
  if (!access) return NextResponse.json({ error: "invalid_token" }, { status: 404 });

  const ctx = access as Context;
  if (ctx.status === "USADO") return NextResponse.json({ error: "already_used" }, { status: 409 });
  if (ctx.status === "EXPIRADO") {
    return NextResponse.json({ error: "expired_token" }, { status: 410 });
  }

  const kind = normalizeInternalKind(ctx.kind);
  if (!kind) return NextResponse.json({ error: "invalid_token" }, { status: 404 });

  const check =
    kind === "FIRST_PURCHASE"
      ? validateServiceForm(body.data)
      : validateIncidentForm(body.data);
  if (!check.ok || !check.normalized) {
    return NextResponse.json({ error: "validation", errors: check.errors }, { status: 422 });
  }

  const { data: result, error } = await supabase.rpc("submit_internal_response", {
    p_token: body.token,
    p_data: check.normalized,
  });

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("already_used")) {
      return NextResponse.json({ error: "already_used" }, { status: 409 });
    }
    if (msg.includes("expired_token")) {
      return NextResponse.json({ error: "expired_token" }, { status: 410 });
    }
    if (msg.includes("invalid_token") || msg.includes("invalid_kind")) {
      return NextResponse.json({ error: "invalid_token" }, { status: 404 });
    }
    return NextResponse.json({ error: "server_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result });
}
