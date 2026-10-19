import "server-only";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/supabase/auth";
import { adminHomePath, isDepartmentReviewer } from "@/lib/access";

/** Routes a department reviewer may open. Everything else is hard-blocked. */
export const REVIEWER_ALLOWED_PREFIXES = ["/admin/reviews"];

export function reviewerCanOpen(pathname: string): boolean {
  return REVIEWER_ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Server-side guard for admin pages a DEPARTMENT_REVIEWER must never open.
 * Call at the top of the page and use the returned session.
 */
export async function requireStaffAccess() {
  const session = await getAdminSession();
  if (!session.user) redirect("/admin/login");
  if (!session.role) redirect("/admin/login?error=role");
  if (isDepartmentReviewer(session.role)) {
    redirect(adminHomePath(session.role));
  }
  return session;
}
