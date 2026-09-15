import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";

export async function POST(req: Request) {
  const { supabase, user } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });

  const body = (await req.json()) as {
    id?: string;
    evaluation?: {
      section13?: { decision?: string };
    };
  };
  if (!body.id || !body.evaluation) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const decision = body.evaluation.section13?.decision;
  const ALLOWED = [
    "PENDIENTE",
    "EN_REVISION",
    "APROBADO",
    "APROBADO_CONDICIONES",
    "RECHAZADO",
  ];
  const status = ALLOWED.includes(decision ?? "") ? decision! : undefined;

  const { data, error } = await supabase
    .from("supplier_registrations")
    .update({
      evaluation: body.evaluation as never,
      ...(status ? { status } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "EVALUATION_SAVED",
    subject_type: "registration",
    subject_id: body.id,
    detail: { decision: status ?? null },
  });

  return NextResponse.json({ ok: true });
}