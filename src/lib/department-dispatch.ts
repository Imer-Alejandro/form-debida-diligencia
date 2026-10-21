import type { RiskTriggers } from "@/lib/risk";

type DepartmentTrigger = Pick<
  RiskTriggers,
  "finance" | "legal" | "technology"
>;

export function getDepartmentReviewIdsToDispatch(
  requiredDepartments: string[],
  triggers: DepartmentTrigger
): string[] {
  return [
    ...new Set([
      ...requiredDepartments,
      ...(triggers.finance ? ["FINANCE"] : []),
      ...(triggers.legal ? ["LEGAL"] : []),
      ...(triggers.technology ? ["TECHNOLOGY"] : []),
    ]),
  ];
}
