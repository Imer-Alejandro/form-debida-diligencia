import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import {
  hasAnyRole,
  SUPPLIER_MANAGEMENT_ROLES,
  SUPPLIER_READ_ROLES,
} from "@/lib/access";
import {
  departmentReviewEmail,
  parseMailRecipients,
  sendMail,
} from "@/lib/mail";
import { ensureDepartmentReviewerAccount } from "@/lib/department-reviewer-account";
import { isValidScore } from "@/lib/department-criteria";

const REVIEW_ACTIONS = [
  "SEND",
  "RECEIVE",
  "REQUEST_INFO",
  "RESUME",
  "RESPOND",
] as const;

export async function GET() {
  const { supabase, user, role } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (!hasAnyRole(role, SUPPLIER_READ_ROLES) && role !== "DEPARTMENT_REVIEWER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("department_reviews")
    .select(
      "id, registration_id, department, request_reason, required, status, requested_at, sent_at, received_at, due_at, remaining_sla_seconds, paused_at, response_status, response_notes, scores, score_average, score_band, responded_at, assigned_to, last_escalated_at, escalation_count, supplier_registrations!inner(company_name, reference_no), review_departments!inner(name)"
    )
    .order("requested_at", { ascending: false });
  if (error) {
    console.error("Could not load department reviews:", error.message);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reviews: data ?? [] });
}

export async function POST(req: Request) {
  const { supabase, user, role } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    action?: string;
    notes?: string;
    responseStatus?: string;
    scores?: Record<string, unknown> | null;
  } | null;
  if (
    !body?.id ||
    !REVIEW_ACTIONS.includes(body.action as (typeof REVIEW_ACTIONS)[number])
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  let scores: Record<string, number> | null = null;
  if (body.scores && typeof body.scores === "object") {
    scores = {};
    for (const [key, value] of Object.entries(body.scores)) {
      if (isValidScore(value)) scores[key] = value;
    }
    if (Object.keys(scores).length === 0) scores = null;
  }
  if (
    body.action === "RESPOND" &&
    body.scores &&
    typeof body.scores === "object" &&
    scores === null
  ) {
    return NextResponse.json({ error: "invalid_scores" }, { status: 400 });
  }
  if (body.action === "SEND") {
    if (!hasAnyRole(role, SUPPLIER_MANAGEMENT_ROLES)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { data: review, error: reviewError } = await supabase
      .from("department_reviews")
      .select(
        "id, registration_id, department, request_reason, status, sent_at, review_departments!inner(name, recipient_email), supplier_registrations!inner(company_name, reference_no)"
      )
      .eq("id", body.id)
      .maybeSingle();
    if (reviewError || !review) {
      return NextResponse.json({ error: reviewError ? "db" : "not_found" }, {
        status: reviewError ? 500 : 404,
      });
    }
    const department = Array.isArray(review.review_departments)
      ? review.review_departments[0]
      : review.review_departments;
    const registration = Array.isArray(review.supplier_registrations)
      ? review.supplier_registrations[0]
      : review.supplier_registrations;
    if (review.status !== "REQUESTED" || review.sent_at) {
      return NextResponse.json({ error: "invalid_transition" }, { status: 409 });
    }
    const recipients = parseMailRecipients(department?.recipient_email);
    if (!department || recipients.length === 0) {
      return NextResponse.json({ error: "department_email_not_configured" }, { status: 409 });
    }
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
      const email = departmentReviewEmail({
        company: registration?.company_name ?? "Proveedor",
        reference: registration?.reference_no ?? null,
        department: department.name,
        requestReason: review.request_reason,
        link: `${base}/admin/reviews/${review.id}`,
      });
      await Promise.all(
        recipients.map((recipient) => sendMail({ ...email, to: recipient }))
      );
      await ensureDepartmentReviewerAccount({
        supabase,
        recipients: department.recipient_email,
        department: review.department,
        departmentName: department.name,
        caseId: review.id,
      });
    } catch (error) {
      console.error(
        "Could not send department review request:",
        error instanceof Error ? error.message : error
      );
      return NextResponse.json({ error: "email_send_failed" }, { status: 502 });
    }
  } else if (role !== "ADMIN" && role !== "DEPARTMENT_REVIEWER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.rpc("transition_department_review", {
    p_review_id: body.id,
    p_action: body.action,
    p_notes: body.notes?.trim() || null,
    p_response_status: body.responseStatus ?? null,
    p_scores: scores,
  });
  if (error) {
    if (error.code === "42501") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const knownErrors = [
      "invalid_transition",
      "notes_required",
      "response_required",
      "review_not_found",
      "invalid_scores",
    ];
    if (knownErrors.some((message) => error.message.includes(message))) {
      return NextResponse.json({ error: "invalid_transition" }, { status: 422 });
    }
    console.error("Could not update department review:", error.message);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, review: data });
}
