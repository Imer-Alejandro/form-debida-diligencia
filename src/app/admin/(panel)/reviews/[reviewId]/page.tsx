import { notFound } from "next/navigation";
import {
  DepartmentCaseView,
  type DepartmentCaseDocument,
  type DepartmentCaseSection,
} from "@/components/admin/DepartmentCaseView";
import {
  DepartmentReviews,
  type DepartmentReviewView,
} from "@/components/admin/DepartmentReviews";
import { canReadSupplierRecords } from "@/lib/access";
import { getServerDict } from "@/lib/i18n/server";
import type { Evaluation, SupplierData } from "@/lib/types";
import { getAdminSession } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

function stringLabels(source: object): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

export default async function DepartmentReviewCasePage({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = await params;
  const [{ supabase, user, role, department }, dict] = await Promise.all([
    getAdminSession(),
    getServerDict(),
  ]);
  if (
    !user ||
    (!canReadSupplierRecords(role) && role !== "DEPARTMENT_REVIEWER")
  ) {
    notFound();
  }

  const { data: rawReview, error: reviewError } = await supabase
    .from("department_reviews")
    .select(
      "id, registration_id, department, request_reason, required, status, requested_at, sent_at, received_at, due_at, remaining_sla_seconds, paused_at, response_status, response_notes, responded_at, assigned_to, last_escalated_at, escalation_count, supplier_registrations!inner(company_name, reference_no), review_departments!inner(name)"
    )
    .eq("id", reviewId)
    .maybeSingle();
  if (reviewError) {
    console.error("Could not load department review case:", reviewError.message);
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {dict.admin.departmentReviews.caseLoadFailed}
      </p>
    );
  }
  if (!rawReview) notFound();

  const review: DepartmentReviewView = {
    ...rawReview,
    supplier_registrations: Array.isArray(rawReview.supplier_registrations)
      ? rawReview.supplier_registrations[0]
      : rawReview.supplier_registrations,
    review_departments: Array.isArray(rawReview.review_departments)
      ? rawReview.review_departments[0]
      : rawReview.review_departments,
  } as DepartmentReviewView;

  const [{ data: registration, error: registrationError }, { data: docs, error: docsError }] =
    await Promise.all([
      supabase
        .from("supplier_registrations")
        .select(
          "id, company_name, commercial_name, reference_no, status, risk_level, data, evaluation"
        )
        .eq("id", review.registration_id)
        .maybeSingle(),
      supabase
        .from("registration_documents")
        .select("id, registration_id, ref, file_name, file_size, mime_type, created_at")
        .eq("registration_id", review.registration_id)
        .order("created_at", { ascending: true }),
    ]);
  if (registrationError || docsError) {
    console.error(
      "Could not load department review dossier:",
      registrationError?.message ?? docsError?.message
    );
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {dict.admin.departmentReviews.caseLoadFailed}
      </p>
    );
  }
  if (!registration) notFound();

  const supplierData = registration.data as SupplierData | null;
  const evaluation = registration.evaluation as Evaluation | null;
  const sections: DepartmentCaseSection[] = [];
  const formSections = [
    ["section1", dict.s1],
    ["section2", dict.s2],
    ["section3", dict.s3],
    ["section4", dict.s4],
    ["section5", dict.s5],
    ["section6", dict.s6],
    ["section7", dict.s7],
    ["section8", dict.s8],
    ["section9", dict.s9],
    ["section10", dict.s10],
    ["section11", dict.s11],
  ] as const;
  for (const [key, sectionDict] of formSections) {
    const values = supplierData?.[key as keyof SupplierData];
    if (values) {
      sections.push({
        title: sectionDict.title,
        values,
        labels: stringLabels(sectionDict),
      });
    }
  }
  if (evaluation?.section12) {
    sections.push({
      title: dict.admin.detail.section12,
      values: evaluation.section12,
      labels: stringLabels(dict.admin.detail),
    });
  }
  if (evaluation?.section13) {
    sections.push({
      title: dict.admin.detail.section13,
      values: evaluation.section13,
      labels: stringLabels(dict.admin.detail),
    });
  }

  const company =
    registration.company_name ??
    registration.commercial_name ??
    supplierData?.section1.legalName ??
    dict.admin.departmentReviews.departmentCase.unknownSupplier;

  return (
    <div>
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {dict.admin.departmentReviews.departmentCase.eyebrow} · {review.review_departments.name}
      </p>
      <DepartmentReviews
        reviews={[review]}
        canSend={role === "ADMIN" || role === "PURCHASING"}
        canAct={role === "ADMIN" || role === "DEPARTMENT_REVIEWER"}
        userDepartment={department}
      />
      <DepartmentCaseView
        company={company}
        reference={registration.reference_no}
        status={registration.status}
        risk={registration.risk_level}
        sections={sections}
        documents={(docs ?? []) as DepartmentCaseDocument[]}
        documentsTitle={dict.admin.departmentReviews.departmentCase.documents}
        noDocuments={dict.admin.departmentReviews.departmentCase.noDocuments}
        openDocument={dict.admin.departmentReviews.departmentCase.openDocument}
        yesLabel={dict.common.yes}
        noLabel={dict.common.no}
      />
    </div>
  );
}
