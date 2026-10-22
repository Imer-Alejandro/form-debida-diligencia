import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import {
  canApproveException,
  hasAnyRole,
  SUPPLIER_MANAGEMENT_ROLES,
} from "@/lib/access";
import { computeRisk, evaluateTriggers } from "@/lib/risk";
import { specializedForTriggers } from "@/lib/process";
import { getDepartmentReviewIdsToDispatch } from "@/lib/department-dispatch";
import { ADM_FINAL_DECISIONS, readAdmConfig, syncVendorAfterDecision } from "@/lib/adm";
import {
  departmentReviewEmail,
  parseMailRecipients,
  sendMail,
} from "@/lib/mail";
import { ensureDepartmentReviewerAccount } from "@/lib/department-reviewer-account";
import {
  getAccessToken,
  getItemIdByPath,
  getItemWebUrl,
  ItemNotFoundError,
  OneDriveNotConfiguredError,
  supplierFolderPath,
} from "@/lib/onedrive";
import {
  isFinalRegistrationDecision,
  isRegistrationApproved,
  type Evaluation,
  type SupplierData,
} from "@/lib/types";

const ALLOWED_STATUS = [
  "PENDIENTE",
  "EN_REVISION",
  "APROBADO",
  "APROBADO_CONDICIONES",
  "RECHAZADO",
];

export async function POST(req: Request) {
  const { supabase, user, role } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  let body: {
    id?: string;
    evaluation?: Evaluation;
    approvalExceptionReason?: string;
    dispatchDepartmentRequests?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!body.id || !body.evaluation?.section12) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const decision = body.evaluation.section13?.decision;
  if (!body.dispatchDepartmentRequests && !isFinalRegistrationDecision(decision)) {
    return NextResponse.json({ error: "final_decision_required" }, { status: 422 });
  }
  if (body.dispatchDepartmentRequests && !hasAnyRole(role, SUPPLIER_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (
    !body.dispatchDepartmentRequests &&
    !hasAnyRole(role, SUPPLIER_MANAGEMENT_ROLES) &&
    !(
      canApproveException(role) &&
      ["APROBADO", "APROBADO_CONDICIONES"].includes(decision ?? "") &&
      (body.approvalExceptionReason?.trim().length ?? 0) >= 10
    )
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const s12 = body.evaluation.section12;
  const status =
    !body.dispatchDepartmentRequests && ALLOWED_STATUS.includes(decision ?? "")
      ? decision
      : undefined;

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
  const requiredDepartments = Array.isArray(s12.requiredDepartments)
    ? [...new Set(s12.requiredDepartments)]
    : [];
  const departmentIdsToDispatch = getDepartmentReviewIdsToDispatch(
    requiredDepartments,
    triggers
  );
  if (
    requiredDepartments.length > 20 ||
    requiredDepartments.some((department) => typeof department !== "string")
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const autoTriggeredDepartments = new Set(
    [
      triggers.finance ? "FINANCE" : null,
      triggers.legal ? "LEGAL" : null,
      triggers.technology ? "TECHNOLOGY" : null,
    ].filter((department): department is string => department !== null)
  );
  if (requiredDepartments.length > 0) {
    const { data: activeDepartments, error: activeDepartmentsError } =
      await supabase
        .from("review_departments")
        .select("id")
        .eq("active", true)
        .in("id", requiredDepartments);
    if (activeDepartmentsError) {
      console.error(
        "Could not validate selected review departments:",
        activeDepartmentsError.message
      );
      return NextResponse.json(
        { error: "db", stage: "validate_departments" },
        { status: 500 }
      );
    }
    const activeIds = new Set((activeDepartments ?? []).map((department) => department.id));
    const inactiveDepartment = requiredDepartments.find(
      (department) => !activeIds.has(department)
    );
    if (inactiveDepartment) {
      return NextResponse.json(
        { error: "invalid_department", department: inactiveDepartment },
        { status: 422 }
      );
    }
  }
  const departmentReasons: Record<string, string> = {};
  for (const department of requiredDepartments) {
    if (autoTriggeredDepartments.has(department)) continue;
    const rawReason = s12.departmentReasons?.[department];
    const reason = typeof rawReason === "string" ? rawReason.trim() : "";
    if (reason.length < 10) {
      return NextResponse.json(
        { error: "department_reason_required", department },
        { status: 422 }
      );
    }
    departmentReasons[department] = reason.slice(0, 1000);
  }

  if (body.dispatchDepartmentRequests) {
    const { data: registration, error: registrationError } = await supabase
      .from("supplier_registrations")
      .select("status")
      .eq("id", body.id)
      .maybeSingle();
    if (registrationError || !registration) {
      console.error(
        "Could not check supplier status before dispatching department reviews:",
        registrationError?.message
      );
      return NextResponse.json(
        { error: "db", stage: "check_registration_before_dispatch" },
        { status: 500 }
      );
    }
    if (isRegistrationApproved(registration.status)) {
      return NextResponse.json(
        { error: "supplier_already_approved" },
        { status: 409 }
      );
    }
  }

  const payload = {
    outcome: status ?? "NO_DECISION",
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
    required_departments: requiredDepartments,
    department_reasons: departmentReasons,
    specialized,
    evaluation,
    created_by: user.id,
    created_by_email: user.email ?? "",
    approval_exception: body.approvalExceptionReason
      ? { reason: body.approvalExceptionReason }
      : null,
  };

  // Preferred path: atomic function (history + risk_level sync).
  const { error: rpcError } = await supabase.rpc("save_supplier_evaluation", {
    p_registration_id: body.id,
    p_payload: payload,
  });

  if (rpcError) {
    if (rpcError.code === "42501") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    console.error("Could not save supplier evaluation:", {
      code: rpcError.code,
      message: rpcError.message,
    });
    return NextResponse.json(
      {
        error: "evaluation_save_failed",
        diagnosticCode: rpcError.code ?? null,
        stage: "save_evaluation",
      },
      { status: 500 }
    );
  }

  const departmentRequests: {
    department: string;
    status: "sent" | "failed" | "not_configured";
    accountStatus?: "ready" | "failed" | "role_conflict" | "not_configured";
  }[] = [];
  const shouldDispatchDepartmentRequests =
    body.dispatchDepartmentRequests ||
    (Boolean(status && isRegistrationApproved(status)) &&
      departmentIdsToDispatch.length > 0);
  if (shouldDispatchDepartmentRequests) {
    const { data: reviewRows, error: reviewError } = await supabase
      .from("department_reviews")
      .select("id, department, request_reason, status, sent_at")
      .eq("registration_id", body.id)
      .in("department", departmentIdsToDispatch);
    if (reviewError) {
      console.error("Could not load department reviews to send:", reviewError.message);
      return NextResponse.json(
        { error: "db", stage: "load_department_reviews" },
        { status: 500 }
      );
    }
    const pendingReviewRows = (reviewRows ?? []).filter(
      (review) => review.status === "REQUESTED" && !review.sent_at
    );
    if (body.dispatchDepartmentRequests && pendingReviewRows.length === 0) {
      return NextResponse.json(
        {
          error: reviewRows?.length
            ? "department_reviews_already_dispatched"
            : "department_reviews_not_created",
          saved: true,
          departments: departmentIdsToDispatch,
          reviewStatuses: (reviewRows ?? []).map((review) => ({
            department: review.department,
            status: review.status,
            sent: Boolean(review.sent_at),
          })),
        },
        { status: 409 }
      );
    }
    if (pendingReviewRows.length) {
      const departmentIds = [...new Set(pendingReviewRows.map((row) => row.department))];
      const { data: departmentRows, error: departmentError } = await supabase
        .from("review_departments")
        .select("id, name, recipient_email")
        .in("id", departmentIds);
      if (departmentError) {
        console.error("Could not load department notification addresses:", departmentError.message);
        return NextResponse.json(
          { error: "db", stage: "load_department_recipients" },
          { status: 500 }
        );
      }
      const departments = new Map((departmentRows ?? []).map((row) => [row.id, row]));
      const { data: supplier } = await supabase
        .from("supplier_registrations")
        .select("company_name, reference_no")
        .eq("id", body.id)
        .maybeSingle();
      const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
      const requests = await Promise.all(
        pendingReviewRows.map(async (review) => {
          const department = departments.get(review.department);
          const recipients = parseMailRecipients(department?.recipient_email);
          if (!department || recipients.length === 0) {
            return { department: review.department, status: "not_configured" as const };
          }
          try {
            const message = departmentReviewEmail({
              company: supplier?.company_name ?? "Proveedor",
              reference: supplier?.reference_no ?? null,
              department: department.name,
              requestReason: review.request_reason,
              link: `${base}/admin/reviews/${review.id}`,
            });
            await Promise.all(
              recipients.map((recipient) =>
                sendMail({ ...message, to: recipient })
              )
            );
            const { error: sendLogError } = await supabase.rpc(
              "transition_department_review",
              { p_review_id: review.id, p_action: "SEND" }
            );
            if (sendLogError) {
              console.error("Review request email sent but not logged:", sendLogError.message);
              return { department: review.department, status: "failed" as const };
            }
            const accountResults = await ensureDepartmentReviewerAccount({
              supabase,
              recipients: department.recipient_email,
              department: review.department,
              departmentName: department.name,
              caseId: review.id,
            });
            const accountStatus: "ready" | "failed" | "role_conflict" | "not_configured" =
              accountResults.some(
              (result) => result.status === "failed"
            )
              ? "failed"
              : accountResults.some(
                    (result) => result.status === "role_conflict"
                  )
                ? "role_conflict"
                : accountResults.some(
                      (result) => result.status === "not_configured"
                    )
                  ? "not_configured"
                  : "ready";
            return {
              department: review.department,
              status: "sent" as const,
              accountStatus,
            };
          } catch (error) {
            console.error(
              `Could not send department review request (${review.department}):`,
              error instanceof Error ? error.message : error
            );
            return { department: review.department, status: "failed" as const };
          }
        })
      );
      departmentRequests.push(...requests);
    }
  }

  if (body.dispatchDepartmentRequests) {
    return NextResponse.json({
      ok: true,
      risk: result.level,
      departmentRequests,
    });
  }

  const { data: savedRegistration, error: savedStatusError } = await supabase
    .from("supplier_registrations")
    .select("status")
    .eq("id", body.id)
    .maybeSingle();
  if (savedStatusError || !savedRegistration) {
    console.error("Could not verify the saved evaluation status:", savedStatusError?.message);
    return NextResponse.json(
      { error: "db", stage: "verify_saved_evaluation" },
      { status: 500 }
    );
  }

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "EVALUATION_SAVED",
    subject_type: "registration",
    subject_id: body.id,
    detail: {
      decision: savedRegistration.status,
      risk: result.level,
      escalated: triggers.requiresEscalation,
    },
  });

  if (status && isRegistrationApproved(status) && savedRegistration.status !== status) {
    const { data: pendingReviews, error: pendingError } = await supabase
      .from("department_reviews")
      .select("department")
      .eq("registration_id", body.id)
      .eq("required", true)
      .neq("status", "COMPLETED");
    if (pendingError) {
      console.error("Could not verify outstanding department reviews:", pendingError.message);
      return NextResponse.json(
        { error: "db", stage: "check_pending_reviews" },
        { status: 500 }
      );
    }
    const departments = [
      ...new Set((pendingReviews ?? []).map((review) => review.department)),
    ];
    return NextResponse.json(
      {
        error: departments.length ? "department_reviews_pending" : "approval_not_confirmed",
        departments,
        departmentRequests,
      },
      { status: 409 }
    );
  }

  let adm: { ok: boolean; action?: string; error?: string } | null = null;
  let sharepoint: { ok: boolean; error?: string } | null = null;
  if (
    status &&
    savedRegistration.status === status &&
    ADM_FINAL_DECISIONS.includes(status)
  ) {
    try {
      const { data: reg } = await supabase
        .from("supplier_registrations")
        .select("data")
        .eq("id", body.id)
        .maybeSingle();

      const supplierData = (reg?.data ?? null) as SupplierData | null;
      const admConfig = readAdmConfig();
      let sharePointFolderUrl: string | undefined;
      if (admConfig && isRegistrationApproved(status) && supplierData) {
        try {
          const accessToken = await getAccessToken();
          const folderId = await getItemIdByPath(
            accessToken,
            supplierFolderPath(supplierData.section1.legalName)
          );
          sharePointFolderUrl = await getItemWebUrl(accessToken, folderId);
          sharepoint = { ok: true };
        } catch (err) {
          const error = err instanceof OneDriveNotConfiguredError
            ? "onedrive_not_configured"
            : err instanceof ItemNotFoundError
              ? "supplier_folder_not_found"
              : "sharepoint_link_unavailable";
          sharepoint = { ok: false, error };
          await supabase.from("activity_log").insert({
            actor: user.email ?? "",
            action: "SHAREPOINT_VENDOR_FOLDER_LINK_ERROR",
            subject_type: "registration",
            subject_id: body.id,
            detail: { error },
          });
        }
      }

      const sync = await syncVendorAfterDecision(
        admConfig,
        supplierData,
        status,
        undefined,
        sharePointFolderUrl
      );
      adm = sync;

      await supabase.from("activity_log").insert({
        actor: user.email ?? "",
        action: `ADM_VENDOR_SYNC_${(sync.action ?? "unknown").toUpperCase()}`,
        subject_type: "registration",
        subject_id: body.id,
        detail: {
          decision: status,
          action: sync.action ?? null,
          error: sync.error ?? null,
          sharepointFolderLinked: sharepoint?.ok ?? false,
        },
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

  return NextResponse.json({
    ok: true,
    risk: result.level,
    triggers,
    adm,
    sharepoint,
    departmentRequests,
  });
}
