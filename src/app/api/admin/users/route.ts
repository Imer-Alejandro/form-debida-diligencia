import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import { isAppRole } from "@/lib/access";
import {
  createAdminAccount,
  deleteAdminAccount,
  isUserAdminConfigured,
  listAdminAccounts,
  updateAdminAccountPassword,
  type AdminAccountRow,
} from "@/lib/admin-accounts";
import {
  adminCredentialsEmail,
  isMailConfigured,
  sendMail,
} from "@/lib/mail";

export interface AdminUserRow {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignIn: string | null;
  confirmed: boolean;
  role: string | null;
  department: string | null;
}

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}

function languageOf(req: Request): "es" | "en" {
  const header = (req.headers.get("accept-language") ?? "").toLowerCase();
  return header.startsWith("en") ? "en" : "es";
}

async function sendCredentials(
  req: Request,
  args: {
    email: string;
    password: string | null;
    kind: "create" | "reset";
    department: string | null;
  }
): Promise<boolean> {
  if (!isMailConfigured()) return false;
  try {
    await sendMail({
      ...adminCredentialsEmail(languageOf(req), {
        email: args.email,
        password: args.password,
        loginLink: `${baseUrl()}/admin/login`,
        kind: args.kind,
        department: args.department,
        appName:
          languageOf(req) === "es"
            ? "Portal de Debida Diligencia"
            : "Due Diligence Portal",
      }),
      to: args.email,
    });
    return true;
  } catch (error) {
    console.error("Could not send credentials email:", error);
    return false;
  }
}

export async function GET() {
  const { supabase, user, role } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (role !== "ADMIN")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!isUserAdminConfigured())
    return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let accounts: AdminAccountRow[];
  try {
    accounts = await listAdminAccounts();
  } catch (error) {
    console.error("Could not list admin accounts:", error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const [assignmentsResult, departmentsResult] = await Promise.all([
    supabase.from("app_user_roles").select("user_id, role, department"),
    supabase
      .from("review_departments")
      .select("id, name")
      .eq("active", true)
      .order("name"),
  ]);
  if (assignmentsResult.error) {
    console.error(
      "Could not load user roles:",
      assignmentsResult.error.message
    );
    return NextResponse.json(
      { error: "role_data_unavailable" },
      { status: 503 }
    );
  }
  if (departmentsResult.error) {
    console.error(
      "Could not load review departments:",
      departmentsResult.error.message
    );
    return NextResponse.json(
      { error: "department_data_unavailable" },
      { status: 503 }
    );
  }

  const roleByUser = new Map(
    (assignmentsResult.data ?? []).map((assignment) => [
      assignment.user_id,
      assignment,
    ])
  );

  const rows: AdminUserRow[] = accounts.map((account) => {
    const assignment = roleByUser.get(account.id);
    return {
      ...account,
      role: assignment?.role ?? null,
      department: assignment?.department ?? null,
    };
  });

  return NextResponse.json({
    ok: true,
    users: rows,
    departments: departmentsResult.data ?? [],
  });
}

export async function POST(req: Request) {
  const { supabase, user, role: actorRole } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (actorRole !== "ADMIN")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!isUserAdminConfigured())
    return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const body = (await req.json()) as {
    email?: string;
    password?: string;
    role?: string;
    department?: string | null;
    sendCredentials?: boolean;
  };
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const appRole = isAppRole(body.role) ? body.role : null;
  const department =
    typeof body.department === "string" ? body.department.trim() : "";
  const wantsCredentials = body.sendCredentials !== false;

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 8 ||
    !appRole ||
    (appRole === "DEPARTMENT_REVIEWER" ? !department : Boolean(department))
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (appRole === "DEPARTMENT_REVIEWER") {
    const { data: departmentRow, error: departmentError } = await supabase
      .from("review_departments")
      .select("id")
      .eq("id", department)
      .eq("active", true)
      .maybeSingle();
    if (departmentError || !departmentRow) {
      return NextResponse.json({ error: "invalid_department" }, { status: 400 });
    }
  }

  let created: AdminAccountRow;
  try {
    created = await createAdminAccount({ email, password });
  } catch (error) {
    const msg = (error instanceof Error ? error.message : "").toLowerCase();
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("duplicate key")
    ) {
      return NextResponse.json({ error: "user_exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const { error: assignmentError } = await supabase.from("app_user_roles").insert({
    user_id: created.id,
    role: appRole,
    department: appRole === "DEPARTMENT_REVIEWER" ? department : null,
  });
  if (assignmentError) {
    console.error(
      "Could not assign role to new user:",
      assignmentError.message
    );
    try {
      await deleteAdminAccount(created.id);
    } catch (cleanupError) {
      console.error(
        "Could not remove user after role assignment failed:",
        cleanupError
      );
    }
    return NextResponse.json(
      { error: "role_assignment_failed" },
      { status: 500 }
    );
  }

  const credentialsSent = wantsCredentials
    ? await sendCredentials(req, {
        email,
        password,
        kind: "create",
        department: department || null,
      })
    : false;

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "ADMIN_USER_CREATED",
    subject_type: "auth_user",
    subject_id: created.id,
    detail: { email, role: appRole, department: department || null },
  });

  return NextResponse.json({
    ok: true,
    credentialsSent,
    user: {
      id: created.id,
      email,
      createdAt: created.createdAt,
      lastSignIn: null,
      confirmed: true,
      role: appRole,
      department: department || null,
    } satisfies AdminUserRow,
  });
}

export async function PUT(req: Request) {
  const { supabase, user, role: actorRole } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (actorRole !== "ADMIN")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!isUserAdminConfigured())
    return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const body = (await req.json()) as {
    id?: string;
    role?: string;
    department?: string | null;
    password?: string | null;
    sendCredentials?: boolean;
  };
  const appRole = isAppRole(body.role) ? body.role : null;
  const department =
    typeof body.department === "string" ? body.department.trim() : "";
  const newPassword =
    typeof body.password === "string" && body.password.length >= 8
      ? body.password
      : null;
  if (
    !body.id ||
    (appRole && appRole === "DEPARTMENT_REVIEWER" ? !department : false) ||
    (!appRole && !newPassword)
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (appRole && appRole !== "DEPARTMENT_REVIEWER" && department) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (appRole === "DEPARTMENT_REVIEWER") {
    const { data: departmentRow, error: departmentError } = await supabase
      .from("review_departments")
      .select("id")
      .eq("id", department)
      .eq("active", true)
      .maybeSingle();
    if (departmentError || !departmentRow) {
      return NextResponse.json({ error: "invalid_department" }, { status: 400 });
    }
  }

  const { data: current, error: currentError } = await supabase
    .from("app_user_roles")
    .select("role")
    .eq("user_id", body.id)
    .maybeSingle();
  if (currentError)
    return NextResponse.json({ error: "db" }, { status: 500 });

  if (appRole && current?.role === "ADMIN" && appRole !== "ADMIN") {
    const { count, error: countError } = await supabase
      .from("app_user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "ADMIN");
    if (countError) return NextResponse.json({ error: "db" }, { status: 500 });
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "last_admin" }, { status: 409 });
    }
  }

  if (appRole) {
    const { error } = await supabase
      .from("app_user_roles")
      .upsert(
        {
          user_id: body.id,
          role: appRole,
          department: appRole === "DEPARTMENT_REVIEWER" ? department : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (error) {
      if (error.message.toLowerCase().includes("violates foreign key")) {
        return NextResponse.json({ error: "role_not_found" }, { status: 404 });
      }
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
  }

  if (newPassword) {
    try {
      await updateAdminAccountPassword(body.id, newPassword);
    } catch {
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
  }

  let credentialsSent = false;
  if (newPassword && body.sendCredentials !== false) {
    const accounts = await listAdminAccounts().catch(
      () => [] as AdminAccountRow[]
    );
    const target = accounts.find((account) => account.id === body.id);
    if (target) {
      credentialsSent = await sendCredentials(req, {
        email: target.email,
        password: newPassword,
        kind: "reset",
        department: department || null,
      });
    }
  }

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "ADMIN_USER_ROLE_UPDATED",
    subject_type: "auth_user",
    subject_id: body.id,
    detail: {
      role: appRole,
      department: department || null,
      passwordReset: Boolean(newPassword),
    },
  });
  return NextResponse.json({ ok: true, credentialsSent });
}

export async function DELETE(req: Request) {
  const { supabase, user, role: actorRole } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (actorRole !== "ADMIN")
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!isUserAdminConfigured())
    return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const body = (await req.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (body.id === user.id) {
    return NextResponse.json({ error: "self_delete" }, { status: 400 });
  }

  const { data: targetRole, error: roleError } = await supabase
    .from("app_user_roles")
    .select("role")
    .eq("user_id", body.id)
    .maybeSingle();
  if (roleError) return NextResponse.json({ error: "db" }, { status: 500 });
  if (targetRole?.role === "ADMIN") {
    const { count, error: countError } = await supabase
      .from("app_user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "ADMIN");
    if (countError) return NextResponse.json({ error: "db" }, { status: 500 });
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "last_admin" }, { status: 409 });
    }
  }

  try {
    await deleteAdminAccount(body.id);
  } catch (error) {
    console.error("Could not delete admin account:", error);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    actor: user.email ?? "",
    action: "ADMIN_USER_DELETED",
    subject_type: "auth_user",
    subject_id: body.id,
  });

  return NextResponse.json({ ok: true });
}
