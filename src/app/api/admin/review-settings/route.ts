import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/supabase/auth";
import { getAdminApi, isAdminApiConfigured } from "@/lib/supabase/admin";

type AdminAccess =
  | { admin: ReturnType<typeof getAdminApi>; response?: never }
  | { admin?: never; response: NextResponse };

const validEmailList = (value: unknown): value is string | null => {
  if (value === null || value === "") return true;
  if (typeof value !== "string" || value.length > 500) return false;
  return value
    .split(/[,;]/)
    .map((email) => email.trim())
    .every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
};

const validHolidayDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

async function authorize(): Promise<AdminAccess> {
  const { user, role } = await getAdminSession();
  if (!user) return { response: NextResponse.json({ error: "no_auth" }, { status: 401 }) };
  if (role !== "ADMIN") {
    return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  if (!isAdminApiConfigured()) {
    return { response: NextResponse.json({ error: "not_configured" }, { status: 503 }) };
  }
  return { admin: getAdminApi() };
}

export async function GET() {
  const access = await authorize();
  if (access.response) return access.response;
  const admin = access.admin;
  const [departments, holidays] = await Promise.all([
    admin
      .from("review_departments")
      .select("id, name, recipient_email, escalation_email, active")
      .order("name"),
    admin
      .from("business_holidays")
      .select("holiday_date, name, active")
      .eq("active", true)
      .order("holiday_date"),
  ]);
  if (departments.error || holidays.error) {
    console.error(
      "Could not load SLA settings:",
      departments.error?.message ?? holidays.error?.message
    );
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  return NextResponse.json({
    departments: departments.data ?? [],
    holidays: holidays.data ?? [],
  });
}

export async function POST(req: Request) {
  const access = await authorize();
  if (access.response) return access.response;
  const admin = access.admin;
  const body = (await req.json().catch(() => null)) as {
    kind?: string;
    id?: string;
    name?: string;
    recipientEmail?: string | null;
    escalationEmail?: string | null;
    active?: boolean;
    holidayDate?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (body.kind === "department") {
    const id = String(body.id ?? "").trim().toUpperCase();
    const name = String(body.name ?? "").trim();
    if (
      !/^[A-Z][A-Z0-9_]{1,31}$/.test(id) ||
      name.length < 2 ||
      name.length > 100 ||
      !validEmailList(body.recipientEmail) ||
      !validEmailList(body.escalationEmail)
    ) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const { error } = await admin.from("review_departments").upsert(
      {
        id,
        name,
        recipient_email: body.recipientEmail?.trim() || null,
        escalation_email: body.escalationEmail?.trim() || null,
        active: body.active !== false,
      },
      { onConflict: "id" }
    );
    if (error) {
      console.error("Could not save review department:", error.message);
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "holiday") {
    const name = String(body.name ?? "").trim();
    if (!validHolidayDate(body.holidayDate) || name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const { error } = await admin.from("business_holidays").upsert(
      { holiday_date: body.holidayDate, name, active: true },
      { onConflict: "holiday_date" }
    );
    if (error) {
      console.error("Could not save business holiday:", error.message);
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "bad_request" }, { status: 400 });
}

export async function DELETE(req: Request) {
  const access = await authorize();
  if (access.response) return access.response;
  const admin = access.admin;
  const body = (await req.json().catch(() => null)) as {
    holidayDate?: string;
  } | null;
  if (!body || !validHolidayDate(body.holidayDate)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { error } = await admin
    .from("business_holidays")
    .delete()
    .eq("holiday_date", body.holidayDate);
  if (error) {
    console.error("Could not delete business holiday:", error.message);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
