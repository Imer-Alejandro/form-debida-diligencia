import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Admin client using the service-role key. Server-side only: never import
 *  this from client components or expose the key to the browser. */
export function getAdminApi() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("admin_api_not_configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isAdminApiConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}