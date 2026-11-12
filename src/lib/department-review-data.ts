import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type ReviewSlaRow = {
  id: string;
  status: string;
  due_at: string | null;
  remaining_sla_seconds: number | null;
};

export async function withLiveDepartmentSla<T extends ReviewSlaRow>(
  supabase: SupabaseClient,
  reviews: T[]
): Promise<(Omit<T, "remaining_sla_seconds"> & {
  remaining_sla_seconds: number | null;
})[]> {
  const now = new Date().toISOString();
  return Promise.all(
    reviews.map(async (review) => {
      if (review.status !== "IN_REVIEW") return review;
      if (!review.due_at) {
        return { ...review, remaining_sla_seconds: null };
      }

      try {
        const { data, error } = await supabase.rpc(
          "business_seconds_between",
          { p_start: now, p_end: review.due_at }
        );
        if (error) {
          console.error(
            `Could not calculate remaining SLA for department review ${review.id}:`,
            error.message
          );
          return { ...review, remaining_sla_seconds: null };
        }
        return {
          ...review,
          remaining_sla_seconds:
            typeof data === "number" ? data : null,
        };
      } catch (error) {
        console.error(
          `Could not calculate remaining SLA for department review ${review.id}:`,
          error instanceof Error ? error.message : error
        );
        return { ...review, remaining_sla_seconds: null };
      }
    })
  );
}
