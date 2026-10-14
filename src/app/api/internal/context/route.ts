import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_internal_access_for_token", {
    p_token: token,
  });

  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "invalid_token" }, { status: 404 });

  return NextResponse.json({ access: data });
}
