import { NextResponse } from "next/server";
import { hasAnyRole, SUPPLIER_MANAGEMENT_ROLES } from "@/lib/access";
import { getAdminSession } from "@/lib/supabase/auth";
import { getAdminApi } from "@/lib/supabase/admin";
import { computeRisk, evaluateTriggers } from "@/lib/risk";
import { specializedForTriggers } from "@/lib/process";
import type { Evaluation } from "@/lib/types";

export async function POST(req: Request) {
  const { user, role } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (!hasAnyRole(role, SUPPLIER_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const draft = body as { id?: string; evaluation?: Evaluation };
  if (
    typeof draft.id !== "string" ||
    !draft.id ||
    !draft.evaluation?.section12 ||
    !draft.evaluation.section13
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const section12 = draft.evaluation.section12;
  const risk = computeRisk(section12.riskCategories ?? {}, section12.redFlag);
  const triggers = evaluateTriggers({
    ratings: section12.riskCategories ?? {},
    redFlag: section12.redFlag,
    estimatedAmount: section12.estimatedAnnualAmount,
  });
  const evaluation: Evaluation = {
    ...draft.evaluation,
    section12: {
      ...section12,
      computedRisk: risk.level,
      specialized: specializedForTriggers(triggers, section12.specialized),
    },
  };

  try {
    const { data, error } = await getAdminApi()
      .from("supplier_registrations")
      .update({ evaluation, risk_level: risk.level })
      .eq("id", draft.id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Could not autosave supplier evaluation:", error.message);
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  } catch (error) {
    console.error(
      "Could not autosave supplier evaluation:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, risk: risk.level });
}
