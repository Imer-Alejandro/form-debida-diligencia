import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildEncryptedConfig, exchangeCodeForToken } from "@/lib/onedrive";

export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get("code");
  const error = new URL(req.url).searchParams.get("error");

  if (error || !code) {
    return Response.redirect(
      new URL(`/admin/settings?connected=0&reason=${error ?? "no_code"}`, req.url),
      302
    );
  }

  try {
    const tokens = await exchangeCodeForToken(code);
    const encrypted = buildEncryptedConfig(tokens.refreshToken, tokens.account);

    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      // The admin opened the flow signed out; fall back to the safe rotation RPC
      // path is not possible here, so ask to reconnect from the admin panel.
      return Response.redirect(
        new URL("/admin/settings?connected=0&reason=session", req.url),
        302
      );
    }

    const { error: upErr } = await supabase
      .from("app_config")
      .upsert({ key: "onedrive", value: encrypted }, { onConflict: "key" });

    if (upErr) {
      return Response.redirect(
        new URL(`/admin/settings?connected=0&reason=${encodeURIComponent(upErr.message)}`, req.url),
        302
      );
    }
    return Response.redirect(new URL("/admin/settings?connected=1", req.url), 302);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return Response.redirect(
      new URL(`/admin/settings?connected=0&reason=${encodeURIComponent(msg)}`, req.url),
      302
    );
  }
}