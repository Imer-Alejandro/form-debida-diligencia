export type DepartmentSlaCompliance = "ON_TIME" | "LATE" | "UNKNOWN";

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
