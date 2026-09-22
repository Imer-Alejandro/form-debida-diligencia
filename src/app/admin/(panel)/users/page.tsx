import { getServerDict } from "@/lib/i18n/server";
import { getAdminApi, isAdminApiConfigured } from "@/lib/supabase/admin";
import { UsersManager } from "@/components/admin/UsersManager";
import type { AdminUserRow } from "@/app/api/admin/users/route";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const dict = await getServerDict();
  const u = dict.admin.users;

  let configured = isAdminApiConfigured();
  let rows: AdminUserRow[] = [];

  if (configured) {
    try {
      const admin = getAdminApi();
      const { data } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      rows = (data?.users ?? []).map((x) => ({
        id: x.id,
        email: x.email ?? "",
        createdAt: x.created_at ?? null,
        lastSignIn: x.last_sign_in_at ?? null,
        confirmed: Boolean(x.email_confirmed_at),
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
      <UsersManager items={rows} configured={configured} />
    </div>
  );
}