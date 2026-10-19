export const APP_ROLES = [
  "ADMIN",
  "MANAGEMENT",
  "PURCHASING",
  "DEPARTMENT_REVIEWER",
  "READ_ONLY",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export interface AppAccess {
  role: AppRole | null;
  department: string | null;
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}

export function canAccessAdmin(role: AppRole | null): boolean {
  return role !== null;
}

export function canManageUsers(role: AppRole | null): boolean {
  return role === "ADMIN";
}

export function canManageSuppliers(role: AppRole | null): boolean {
  return role === "ADMIN" || role === "PURCHASING";
}

export function canReadSupplierRecords(role: AppRole | null): boolean {
  return (
    role === "ADMIN" ||
    role === "MANAGEMENT" ||
    role === "PURCHASING" ||
    role === "READ_ONLY"
  );
}

export function canApproveException(role: AppRole | null): boolean {
  return role === "ADMIN" || role === "MANAGEMENT";
}

/** Department reviewers get a locked-down workspace: only their assigned cases. */
export function isDepartmentReviewer(role: AppRole | null): boolean {
  return role === "DEPARTMENT_REVIEWER";
}

/** Landing route for each role inside the admin panel. */
export function adminHomePath(role: AppRole | null): string {
  return isDepartmentReviewer(role) ? "/admin/reviews" : "/admin";
}

export function hasAnyRole(
  role: AppRole | null,
  allowed: readonly AppRole[]
): boolean {
  return role !== null && allowed.includes(role);
}

export const SUPPLIER_MANAGEMENT_ROLES: readonly AppRole[] = [
  "ADMIN",
  "PURCHASING",
];

export const SUPPLIER_READ_ROLES: readonly AppRole[] = [
  "ADMIN",
  "MANAGEMENT",
  "PURCHASING",
  "READ_ONLY",
];
