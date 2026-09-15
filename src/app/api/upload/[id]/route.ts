import { NextRequest } from "next/server";
import { createPublicClient } from "@/lib/supabase/server";

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/upload/[id]">
) {
  const params = await ctx.params;
  const id = params.id;
  const token = new URL(req.url).searchParams.get("token");
  if (!id || !token) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const supabase = createPublicClient();
  const { error } = await supabase
    .from("registration_documents")
    .delete()
    .eq("id", id)
    .eq("invitation_token", token);

  if (error) {
    return Response.json({ error: "server_error", message: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}