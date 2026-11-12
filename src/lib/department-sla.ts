export type DepartmentSlaCompliance = "ON_TIME" | "LATE" | "UNKNOWN";
export const DEPARTMENT_REVIEW_SLA_SECONDS = 3 * 24 * 60 * 60;

export type DepartmentReviewStatus =
  | "REQUESTED"
  | "IN_REVIEW"
  | "INFO_REQUESTED"
  | "COMPLETED"
  | "CANCELLED";

export interface DepartmentReviewProgress {
  id: string;
  department: string;
  departmentName: string;
  status: DepartmentReviewStatus;
  requestedAt: string;
  sentAt: string | null;
  receivedAt: string | null;
  dueAt: string | null;
  remainingSlaSeconds: number | null;
  pausedAt: string | null;
  responseStatus: "APPROVED" | "OBSERVATIONS" | "REJECTED" | null;
  responseNotes: string | null;
  scores: Record<string, number> | null;
  scoreAverage: number | null;
  scoreBand: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
  respondedAt: string | null;
}

export function getSlaDurationParts(seconds: number | null): {
  days: number;
  hours: number;
  minutes: number;
} | null {
  if (seconds === null || !Number.isFinite(seconds)) return null;
  const total = Math.max(0, Math.floor(seconds));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
  };
}

export function getDepartmentSlaCompliance(
  dueAt: string | null,
  respondedAt: string | null
): DepartmentSlaCompliance {
  if (!dueAt || !respondedAt) return "UNKNOWN";

  const due = Date.parse(dueAt);
  const responded = Date.parse(respondedAt);
  if (!Number.isFinite(due) || !Number.isFinite(responded)) return "UNKNOWN";

  return responded <= due ? "ON_TIME" : "LATE";
}
