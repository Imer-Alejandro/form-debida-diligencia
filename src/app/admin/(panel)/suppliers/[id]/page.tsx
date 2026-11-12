import Link from "next/link";
import { requireStaffAccess } from "@/lib/admin-guard";
import type {
  DocumentRow,
  RegistrationRow,
  SpecializedHistoryEntry,
} from "@/lib/types";
import { SupplierDetail } from "@/components/admin/SupplierDetail";
import { withLiveDepartmentSla } from "@/lib/department-review-data";

export const dynamic = "force-dynamic";

export default async function AdminSupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role } = await requireStaffAccess();

  const { data: reg } = await supabase
    .from("supplier_registrations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { data: docs } = await supabase
    .from("registration_documents")
    .select("id, ref, file_name, file_size, mime_type, url, created_at")
    .eq("registration_id", id)
    .order("created_at", { ascending: true });

  const { data: history, error: historyError } = await supabase
    .from("supplier_evaluations")
    .select("id, created_at, created_by_email, specialized, evaluation")
    .eq("registration_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const {
    data: reviewRows,
    error: departmentReviewError,
  } = await supabase
    .from("department_reviews")
    .select(
      "id, department, status, requested_at, sent_at, received_at, due_at, remaining_sla_seconds, paused_at, response_status, response_notes, scores, score_average, score_band, responded_at, review_departments!inner(name)"
    )
    .eq("registration_id", id)
    .eq("required", true)
    .order("requested_at", { ascending: true });
  if (departmentReviewError) {
    console.error(
      "Could not load supplier department review progress:",
      departmentReviewError.message
    );
  }
  const reviewsWithLiveSla = await withLiveDepartmentSla(
    supabase,
    reviewRows ?? []
  );
  const { data: departments } = await supabase
    .from("review_departments")
    .select("id, name")
    .eq("active", true)
    .order("name");
  const { data: exceptions } = await supabase
    .from("approval_exceptions")
    .select("id, actor_email, reason, pending_reviews, created_at")
    .eq("registration_id", id)
    .order("created_at", { ascending: false });

  if (!reg) {
    return (
      <div>
        <Link
          href="/admin/suppliers"
          className="text-[13px] text-ink-muted underline underline-offset-2 hover:text-navy-700"
        >
          ← Volver a la lista
        </Link>
        <p className="mt-6 rounded-2xl border border-navy-800/10 bg-white px-6 py-12 text-center text-sm text-ink-muted">
          Registro no encontrado.
        </p>
      </div>
    );
  }

  return (
    <SupplierDetail
      reg={reg as RegistrationRow}
      docs={(docs ?? []) as DocumentRow[]}
      specializedHistory={(history ?? []) as SpecializedHistoryEntry[]}
      specializedHistoryUnavailable={Boolean(historyError)}
      role={role ?? "READ_ONLY"}
      departmentReviewLoadError={Boolean(departmentReviewError)}
      departmentReviews={reviewsWithLiveSla.map((review) => {
        const department = Array.isArray(review.review_departments)
          ? review.review_departments[0]
          : review.review_departments;
        return {
          id: review.id,
          department: review.department,
          departmentName: department?.name ?? review.department,
          status: review.status,
          requestedAt: review.requested_at,
          sentAt: review.sent_at,
          receivedAt: review.received_at,
          dueAt: review.due_at,
          remainingSlaSeconds: review.remaining_sla_seconds,
          pausedAt: review.paused_at,
          responseStatus: review.response_status,
          responseNotes: review.response_notes,
          scores: (review.scores as Record<string, number> | null) ?? null,
          scoreAverage: review.score_average,
          scoreBand: review.score_band as
            | "POSITIVE"
            | "NEUTRAL"
            | "NEGATIVE"
            | null,
          respondedAt: review.responded_at,
        };
      })}
      departmentOptions={departments ?? []}
      approvalExceptions={exceptions ?? []}
    />
  );
}