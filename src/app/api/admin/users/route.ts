import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import { getAdminApi } from "@/lib/supabase/admin";
import { isAppRole } from "@/lib/access";

export interface AdminUserRow {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignIn: string | null;
  confirmed: boolean;
  role: string | null;
  department: string | null;
}

export async function GET() {
  const { user, role } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let admin;
  try {
    admin = getAdminApi();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  const { data: assignments, error: rolesError } = await admin
    .from("app_user_roles")
    .select("user_id, role, department");
  if (rolesError) {
    console.error("Could not load user roles:", rolesError.message);
    return NextResponse.json({ error: "role_data_unavailable" }, { status: 503 });
  }
  const roleByUser = new Map(
    (assignments ?? []).map((assignment) => [assignment.user_id, assignment])
  );

  const rows: AdminUserRow[] = (data?.users ?? []).map((u) => {
    const assignment = roleByUser.get(u.id);
    return {
    id: u.id,
    email: u.email ?? "",
    createdAt: u.created_at ?? null,
    lastSignIn: u.last_sign_in_at ?? null,
    confirmed: Boolean(u.email_confirmed_at),
      role: assignment?.role ?? null,
      department: assignment?.department ?? null,
    };
  });

  const { data: departments, error: departmentsError } = await admin
    .from("review_departments")
    .select("id, name")
    .eq("active", true)
    .order("name");
  if (departmentsError) {
    console.error("Could not load review departments:", departmentsError.message);
    return NextResponse.json({ error: "department_data_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, users: rows, departments: departments ?? [] });
}

export async function POST(req: Request) {
  const { user, role: actorRole } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (actorRole !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let admin;
  try {
    admin = getAdminApi();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const body = (await req.json()) as {
    email?: string;
    password?: string;
    role?: string;
    department?: string | null;
  };
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const appRole = isAppRole(body.role) ? body.role : null;
  const department = typeof body.department === "string" ? body.department.trim() : "";

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 8 ||
    !appRole ||
    (appRole === "DEPARTMENT_REVIEWER" ? !department : Boolean(department))
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (appRole === "DEPARTMENT_REVIEWER") {
    const { data: departmentRow, error: departmentError } = await admin
      .from("review_departments")
      .select("id")
      .eq("id", department)
      .eq("active", true)
      .maybeSingle();
    if (departmentError || !departmentRow) {
      return NextResponse.json({ error: "invalid_department" }, { status: 400 });
    }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return NextResponse.json({ error: "user_exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  const createdUser = data.user;
  if (!createdUser) return NextResponse.json({ error: "db" }, { status: 500 });
  const { error: assignmentError } = await admin.from("app_user_roles").insert({
    user_id: createdUser.id,
    role: appRole,
    department: appRole === "DEPARTMENT_REVIEWER" ? department : null,
  });
  if (assignmentError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(createdUser.id);
    console.error("Could not assign role to new user:", assignmentError.message);
    if (cleanupError) {
      console.error("Could not remove user after role assignment failed:", cleanupError.message);
    }
    return NextResponse.json({ error: "role_assignment_failed" }, { status: 500 });
  }

  await admin.from("activity_log").insert({
    actor: user.email ?? "",
    action: "ADMIN_USER_CREATED",
    subject_type: "auth_user",
    subject_id: createdUser.id,
    detail: { email, role: appRole, department: department || null },
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: createdUser.id,
      email,
      createdAt: createdUser.created_at ?? null,
      lastSignIn: null,
      confirmed: true,
      role: appRole,
      department: department || null,
    } satisfies AdminUserRow,
  });
}

export async function PUT(req: Request) {
  const { user, role: actorRole } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (actorRole !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let admin;
  try {
    admin = getAdminApi();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const body = (await req.json()) as {
    id?: string;
    role?: string;
    department?: string | null;
  };
  const appRole = isAppRole(body.role) ? body.role : null;
  const department = typeof body.department === "string" ? body.department.trim() : "";
  if (
    !body.id ||
    !appRole ||
    (appRole === "DEPARTMENT_REVIEWER" ? !department : Boolean(department))
  ) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (appRole === "DEPARTMENT_REVIEWER") {
    const { data: departmentRow, error: departmentError } = await admin
      .from("review_departments")
      .select("id")
      .eq("id", department)
      .eq("active", true)
      .maybeSingle();
    if (departmentError || !departmentRow) {
      return NextResponse.json({ error: "invalid_department" }, { status: 400 });
    }
  }

  const { data: current, error: currentError } = await admin
    .from("app_user_roles")
    .select("role")
    .eq("user_id", body.id)
    .maybeSingle();
  if (currentError) return NextResponse.json({ error: "db" }, { status: 500 });
  if (!current) return NextResponse.json({ error: "role_not_found" }, { status: 404 });

  if (current.role === "ADMIN" && appRole !== "ADMIN") {
    const { count, error: countError } = await admin
      .from("app_user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "ADMIN");
    if (countError) return NextResponse.json({ error: "db" }, { status: 500 });
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "last_admin" }, { status: 409 });
    }
  }

  const { error } = await admin
    .from("app_user_roles")
    .update({
      role: appRole,
      department: appRole === "DEPARTMENT_REVIEWER" ? department : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", body.id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  await admin.from("activity_log").insert({
    actor: user.email ?? "",
    action: "ADMIN_USER_ROLE_UPDATED",
    subject_type: "auth_user",
    subject_id: body.id,
    detail: { role: appRole, department: department || null },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, role: actorRole } = await getAdminSession();
  if (!user) return NextResponse.json({ error: "no_auth" }, { status: 401 });
  if (actorRole !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let admin;
  try {
    admin = getAdminApi();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const body = (await req.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (body.id === user.id) {
    return NextResponse.json({ error: "self_delete" }, { status: 400 });
  }

  const { data: targetRole, error: roleError } = await admin
    .from("app_user_roles")
    .select("role")
    .eq("user_id", body.id)
    .maybeSingle();
  if (roleError) return NextResponse.json({ error: "db" }, { status: 500 });
  if (targetRole?.role === "ADMIN") {
    const { count, error: countError } = await admin
      .from("app_user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "ADMIN");
    if (countError) return NextResponse.json({ error: "db" }, { status: 500 });
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "last_admin" }, { status: 409 });
    }
  }

  const { error } = await admin.auth.admin.deleteUser(body.id);
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });

  const api = getAdminApi();
  await api.from("activity_log").insert({
    actor: user.email ?? "",
    action: "ADMIN_USER_DELETED",
    subject_type: "auth_user",
    subject_id: body.id,
  });

  return NextResponse.json({ ok: true });
}