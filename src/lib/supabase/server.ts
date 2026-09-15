import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client for server code. Reads/writes the auth session cookies.
 *
 * `options.shell` — call with `shell: true` when building a response-bound
 * client from a Proxy (the only place where cookies can be written back).
 */
export async function createClient(options?: { shell?: boolean }) {
  if (!url || !key) {
    throw new Error("Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_*");
  }

  const cookieStore = await cookies();

  if (options?.shell) {
    return createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options: opts }) =>
              cookieStore.set(name, value, opts)
            );
          } catch {
            // Ignore when called from a Server Component (read-only context).
          }
        },
      },
    });
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options: opts }) =>
            cookieStore.set(name, value, opts)
          );
        } catch {
          // Ignore when called from a Server Component (read-only context).
        }
      },
    },
  });
}

/**
 * An unauthenticated Supabase client for server code (public routes).
 * Use for operations that rely on Row Level Security with the anon role.
 */
export function createPublicClient() {
  if (!url || !key) {
    throw new Error("Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_*");
  }
  return createServerClient(url, key, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}