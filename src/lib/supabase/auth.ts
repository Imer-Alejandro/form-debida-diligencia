import { createClient } from "@/lib/supabase/server";
import { isAppRole, type AppRole } from "@/lib/access";
import type { User } from "@supabase/supabase-js";

export async function getAdminSession(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User | null;
  role: AppRole | null;
  department: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null, department: null };

  const { data, error } = await supabase
    .from("app_user_roles")
    .select("role, department")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load application role:", error.message);
    return { supabase, user, role: null, department: null };
  }

  return {
    supabase,
    user,
    role: isAppRole(data?.role) ? data.role : null,
    department: typeof data?.department === "string" ? data.department : null,
  };
}