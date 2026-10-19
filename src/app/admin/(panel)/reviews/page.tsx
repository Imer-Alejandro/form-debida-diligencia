import { getAdminSession } from "@/lib/supabase/auth";
import { DepartmentReviews, type DepartmentReviewView } from "@/components/admin/DepartmentReviews";
import { getServerDict } from "@/lib/i18n/server";
import { getAdminApi } from "@/lib/supabase/admin";
import { DepartmentReviewSettings } from "@/components/admin/DepartmentReviewSettings";
import { isDepartmentReviewer } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const [{ supabase, role, department }, dict] = await Promise.all([
    getAdminSession(),
    getServerDict(),
  ]);
  const reviewer = isDepartmentReviewer(role);
  const { data, error } = await supabase
    .from("department_reviews")
    .select(
      "id, registration_id, department, request_reason, required, status, requested_at, sent_at, received_at, due_at, remaining_sla_seconds, paused_at, response_status, response_notes, scores, score_average, score_band, responded_at, last_escalated_at, escalation_count, supplier_registrations!inner(company_name, reference_no), review_departments!inner(name)"
    )
    .order("requested_at", { ascending: false });

  if (error) {
    console.error("Could not load department SLA monitor:", error.message);
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {dict.admin.departmentReviews.loadFailed}
      </p>
    );
  }
  const reviews: DepartmentReviewView[] = (data ?? []).map((row) => ({
    ...row,
    supplier_registrations: Array.isArray(row.supplier_registrations)
      ? row.supplier_registrations[0]
      : row.supplier_registrations,
    review_departments: Array.isArray(row.review_departments)
      ? row.review_departments[0]
      : row.review_departments,
  })) as DepartmentReviewView[];

  if (reviewer) {
    const order = (review: DepartmentReviewView) => {
      if (review.status === "COMPLETED") return 4;
      if (review.status === "INFO_REQUESTED") return 1;
      if (review.status === "IN_REVIEW") return 0;
      if (review.status === "REQUESTED") return 2;
      return 3;
    };
    reviews.sort((a, b) => {
      const byStatus = order(a) - order(b);
      if (byStatus !== 0) return byStatus;
      return (a.due_at ?? "").localeCompare(b.due_at ?? "");
    });
  }

  let departments: {
    id: string;
    name: string;
    recipient_email: string | null;
    escalation_email: string | null;
    active: boolean;
  }[] = [];
  let holidays: { holiday_date: string; name: string; active: boolean }[] = [];
  let settingsError = false;
  if (role === "ADMIN") {
    try {
      const admin = getAdminApi();
      const [departmentResult, holidayResult] = await Promise.all([
        admin
          .from("review_departments")
          .select("id, name, recipient_email, escalation_email, active")
          .order("name"),
        admin
          .from("business_holidays")
          .select("holiday_date, name, active")
          .eq("active", true)
          .order("holiday_date"),
      ]);
      if (departmentResult.error || holidayResult.error) {
        throw new Error(
          departmentResult.error?.message ?? holidayResult.error?.message
        );
      }
      departments = departmentResult.data ?? [];
      holidays = holidayResult.data ?? [];
    } catch (settingsLoadError) {
      console.error(
        "Could not load department SLA settings:",
        settingsLoadError instanceof Error ? settingsLoadError.message : settingsLoadError
      );
      settingsError = true;
    }
  }

  const activeReviews = reviewer
    ? reviews.filter((review) => review.status !== "COMPLETED")
    : reviews;
  const completedReviews = reviewer
    ? reviews.filter((review) => review.status === "COMPLETED")
    : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
          {reviewer
            ? dict.admin.departmentReviews.reviewerTitle
            : dict.admin.departmentReviews.title}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {reviewer
            ? dict.admin.departmentReviews.reviewerSubtitle
            : dict.admin.departmentReviews.subtitle}
        </p>
      </div>
      {reviewer && activeReviews.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
          {dict.admin.departmentReviews.reviewerEmpty}
        </p>
      ) : (
        <DepartmentReviews
          reviews={activeReviews}
          canSend={role === "ADMIN" || role === "PURCHASING"}
          canAct={role === "ADMIN" || role === "DEPARTMENT_REVIEWER"}
          userDepartment={department}
        />
      )}
      {reviewer && completedReviews.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-display text-[15px] font-bold text-slate-900">
            {dict.admin.departmentReviews.reviewerGroupDone}
          </h2>
          <DepartmentReviews
            reviews={completedReviews}
            canSend={false}
            canAct={false}
            userDepartment={department}
          />
        </div>
      )}
      {role === "ADMIN" &&
        (settingsError ? (
          <p className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {dict.admin.departmentReviews.settingsLoadFailed}
          </p>
        ) : (
          <DepartmentReviewSettings
            departments={departments}
            holidays={holidays}
          />
        ))}
    </div>
  );
}
