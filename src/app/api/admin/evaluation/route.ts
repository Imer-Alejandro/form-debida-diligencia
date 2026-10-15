import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import { computeRisk, evaluateTriggers } from "@/lib/risk";
import { specializedForTriggers } from "@/lib/process";
import { ADM_FINAL_DECISIONS, readAdmConfig, syncVendorAfterDecision } from "@/lib/adm";
import type { Evaluation, SupplierData } from "@/lib/types";

const ALLOWED_STATUS = [
  "PENDIENTE",
  "EN_REVISION",
  "APROBADO",
  "APROBADO_CONDICIONES",
  "RECHAZADO",
];

export async function POST(req: Request) {
  const { supabase, user } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });

  const body = (await req.json()) as { id?: string; evaluation?: Evaluation };
  if (!body.id || !body.evaluation?.section12) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const s12 = body.evaluation.section12;
  const decision = body.evaluation.section13?.decision;
  const status = ALLOWED_STATUS.includes(decision ?? "") ? decision : undefined;

  // The server is authoritative: recompute risk from the 12-category ratings
  // (red flag → ALTO) and stamp it onto the snapshot before persisting.
  const result = computeRisk(s12.riskCategories ?? {}, s12.redFlag);
  const triggers = evaluateTriggers({
    ratings: s12.riskCategories ?? {},
    redFlag: s12.redFlag,
    estimatedAmount: s12.estimatedAnnualAmount,
  });
  // A fired trigger forces its specialized validation to at least PENDIENTE.
  const specialized = specializedForTriggers(triggers, s12.specialized);
  const evaluation: Evaluation = {
    ...body.evaluation,
    section12: { ...s12, computedRisk: result.level, specialized },
  };

  const payload = {
    outcome: status ?? "EN_REVISION",
    risk_level: result.level,
    proposed_risk: s12.risk,
    review_type: s12.reviewType,
    estimated_amount: s12.estimatedAnnualAmount,
    red_flag: s12.redFlag,
    red_flag_notes: s12.redFlagNotes,
    average: result.rated > 0 ? result.average : null,
    ratings: s12.riskCategories ?? {},
    triggers: {
      finance: triggers.finance,
      legal: triggers.legal,
      technology: triggers.technology,
    },
    specialized,
    evaluation,
    created_by: user.id,
    created_by_email: user.email ?? "",
  };

  // Preferred path: atomic function (history + risk_level sync).
  const { error: rpcError } = await supabase.rpc("save_supplier_evaluation", {
    p_registration_id: body.id,
    p_payload: payload,
  });

  if (rpcError) {
    // Fallback (e.g. migration not applied yet): keep the previous behaviour.
    const { data, error } = await supabase
      .from("supplier_registrations")
      .update({
        evaluation: evaluation as never,
        risk_level: result.level,
        ...(status ? { status } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
  } else if (status) {
    await supabase
      .from("supplier_registrations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", body.id);
  }

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "EVALUATION_SAVED",
    subject_type: "registration",
    subject_id: body.id,
    detail: { decision: status ?? null, risk: result.level, escalated: triggers.requiresEscalation },
  });

  let adm: { ok: boolean; action?: string; error?: string } | null = null;
  if (status && ADM_FINAL_DECISIONS.includes(status)) {
    try {
      const { data: reg } = await supabase
        .from("supplier_registrations")
        .select("data")
        .eq("id", body.id)
        .maybeSingle();

      const sync = await syncVendorAfterDecision(
        readAdmConfig(),
        (reg?.data ?? null) as SupplierData | null,
        status
      );
      adm = sync;

      await supabase.from("activity_log").insert({
        actor: user.email ?? "",
        action: `ADM_VENDOR_SYNC_${(sync.action ?? "unknown").toUpperCase()}`,
        subject_type: "registration",
        subject_id: body.id,
        detail: { decision: status, action: sync.action ?? null, error: sync.error ?? null },
      });
    } catch (err) {
      adm = { ok: false, error: "adm_error" };
      await supabase.from("activity_log").insert({
        actor: user.email ?? "",
        action: "ADM_VENDOR_SYNC_ERROR",
        subject_type: "registration",
        subject_id: body.id,
        detail: {
          decision: status,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  return NextResponse.json({ ok: true, risk: result.level, triggers, adm });
}
