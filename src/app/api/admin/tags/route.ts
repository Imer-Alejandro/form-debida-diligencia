import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";

export async function POST(req: Request) {
  const { supabase, user } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });

  const body = (await req.json()) as { id?: string; tags?: string[] };
  const tags = Array.isArray(body.tags)
    ? body.tags.map((s) => String(s).trim()).filter(Boolean).slice(0, 10)
    : [];
  if (!body.id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { error } = await supabase
    .from("supplier_registrations")
    .update({ tags, updated_at: new Date().toISOString() })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "TAGS_UPDATED",
    subject_type: "registration",
    subject_id: body.id,
  });

  return NextResponse.json({ ok: true, tags });
}