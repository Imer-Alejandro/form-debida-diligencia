import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/supabase/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user, role } = await getAdminSession();
  if (!user) redirect("/admin/login");
  if (!role) redirect("/admin/login?error=role");

  return (
    <AdminShell email={user.email ?? ""} role={role}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </div>
    </AdminShell>
  );
}