import { getServerDict } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/supabase/auth";
import { getAdminApi, isAdminApiConfigured } from "@/lib/supabase/admin";
import { UsersManager } from "@/components/admin/UsersManager";
import type { AdminUserRow } from "@/app/api/admin/users/route";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { role } = await getAdminSession();
  if (role !== "ADMIN") redirect("/admin");
  const dict = await getServerDict();
  const u = dict.admin.users;

  let configured = isAdminApiConfigured();
  let rows: AdminUserRow[] = [];
  let departments: { id: string; name: string }[] = [];

  if (configured) {
    try {
      const admin = getAdminApi();
      const [{ data }, roleResult, departmentResult] = await Promise.all([
        admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
        }),
        admin.from("app_user_roles").select("user_id, role, department"),
        admin.from("review_departments").select("id, name").eq("active", true),
      ]);
      if (roleResult.error || departmentResult.error) {
        throw new Error("role_data_unavailable");
      }
      const roles = new Map(
        (roleResult.data ?? []).map((assignment) => [
          assignment.user_id,
          assignment,
        ])
      );
      departments = departmentResult.data ?? [];
      rows = (data?.users ?? []).map((x) => ({
        id: x.id,
        email: x.email ?? "",
        createdAt: x.created_at ?? null,
        lastSignIn: x.last_sign_in_at ?? null,
        confirmed: Boolean(x.email_confirmed_at),
        role: roles.get(x.id)?.role ?? null,
        department: roles.get(x.id)?.department ?? null,
      }));
    } catch {
      configured = false;
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
          {u.title}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{u.subtitle}</p>
      </div>
      <UsersManager
        items={rows}
        configured={configured}
        departments={departments}
      />
    </div>
  );
}