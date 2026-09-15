import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function createClient() {
  if (!url || !key) {
    throw new Error("Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_*");
  }
  return createBrowserClient(url, key);
}