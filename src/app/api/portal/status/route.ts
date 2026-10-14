import { NextRequest, NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return handleLookup(q);
}

export async function POST(req: NextRequest) {
  let q = "";
  try {
    const body = await req.json();
    q = body?.q ?? body?.query ?? "";
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  return handleLookup(q);
}

async function handleLookup(query: string) {
  const raw = String(query ?? "").trim();
  if (!raw) {
    return NextResponse.json({ found: false, error: "empty_query" }, { status: 400 });
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_portal_status", {
    p_query: raw,
  });

  if (error) {
    return NextResponse.json(
      { found: false, error: "lookup_failed", message: error.message },
      { status: 500 }
    );
  }

  if (!data || !data.found) {
    return NextResponse.json({ found: false }, { status: 404 });
  }

  return NextResponse.json(data);
}
