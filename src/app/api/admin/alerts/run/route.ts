import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/supabase/auth";
import { runAlertEngine } from "@/lib/alerts";

export async function POST() {
  const { user } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });

  try {
    const summary = await runAlertEngine();
    revalidatePath("/admin/alerts");
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
