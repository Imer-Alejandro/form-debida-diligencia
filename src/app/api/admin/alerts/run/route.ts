import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/supabase/auth";
import { hasAnyRole, SUPPLIER_MANAGEMENT_ROLES } from "@/lib/access";
import { runAlertEngine, runSlaMonitor } from "@/lib/alerts";

export async function POST() {
  const { user, role } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (!hasAnyRole(role, SUPPLIER_MANAGEMENT_ROLES)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const [alerts, sla] = await Promise.all([
      runAlertEngine(),
      runSlaMonitor(),
    ]);
    revalidatePath("/admin/alerts");
    revalidatePath("/admin/reviews");
    return NextResponse.json({ ok: true, ...alerts, sla });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
