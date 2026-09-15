import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/supabase/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user } = await getAdminSession();
  if (!user) redirect("/admin/login");

  return (
    <AdminShell email={user.email ?? ""}>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </div>
    </AdminShell>
  );
}