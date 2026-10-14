import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import { normalizeIncidentStatus, validateIncidentFollowUp } from "@/lib/process";

export async function POST(req: Request) {
  const { supabase, user } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    status?: string;
    recommendedAction?: string;
    resolutionNotes?: string;
  } | null;
  if (!body?.id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { data: current, error: readErr } = await supabase
    .from("supplier_incidents")
    .select("id, registration_id, status")
    .eq("id", body.id)
    .maybeSingle();

  if (readErr || !current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const check = validateIncidentFollowUp(normalizeIncidentStatus(current.status), {
    status: body.status,
    recommendedAction: body.recommendedAction,
    resolutionNotes: body.resolutionNotes,
  });
  if (!check.ok || !check.normalized) {
    return NextResponse.json({ error: "validation", errors: check.errors }, { status: 422 });
  }

  const n = check.normalized;
  const { error } = await supabase
    .from("supplier_incidents")
    .update({
      status: n.status,
      recommended_action: n.recommended_action,
      resolution_notes: n.resolution_notes,
      resolved_at: n.status === "CERRADA" ? new Date().toISOString() : null,
    })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "INCIDENT_FOLLOWUP",
    subject_type: "registration",
    subject_id: current.registration_id,
    detail: {
      incident_id: body.id,
      status: n.status,
      action: n.recommended_action,
    },
  });

  return NextResponse.json({ ok: true, incident: n });
}
