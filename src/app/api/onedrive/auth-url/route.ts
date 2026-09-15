import { createClient } from "@/lib/supabase/server";
import { authUrl } from "@/lib/onedrive";

export async function GET() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.ONEDRIVE_CLIENT_ID) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  return Response.json({ url: authUrl() });
}