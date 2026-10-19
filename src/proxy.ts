import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Admin routes a DEPARTMENT_REVIEWER is allowed to open (everything else is
 *  hard-blocked). Kept in sync with src/lib/admin-guard.ts. */
const REVIEWER_ALLOWED_ADMIN_PREFIXES = ["/admin/reviews"];
/** Authenticated reviewers are also kept away from the public supplier site. */
const PUBLIC_PREFIXES = ["/registro", "/i/", "/interno/"];

/** Next.js 16 "Proxy" (ex-Middleware): refreshes the Supabase session cookies
 *  and enforces the department-reviewer lock-down. */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, setHeaders) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        Object.entries(setHeaders).forEach(([k, v]) =>
          response.headers.set(k, v)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (user && pathname.startsWith("/admin")) {
    const { data: roleRow } = await supabase
      .from("app_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleRow?.role === "DEPARTMENT_REVIEWER") {
      const allowed =
        pathname === "/admin/login" ||
        REVIEWER_ALLOWED_ADMIN_PREFIXES.some((prefix) =>
          pathname.startsWith(prefix)
        );
      if (!allowed) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/admin/reviews";
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  if (user && PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const { data: roleRow } = await supabase
      .from("app_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (roleRow?.role === "DEPARTMENT_REVIEWER") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/reviews";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
