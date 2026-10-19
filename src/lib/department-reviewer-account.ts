import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAdminAccount,
  findAdminAccountIdByEmail,
  generateAdminPassword,
  isUserAdminConfigured,
} from "@/lib/admin-accounts";
import {
  adminCredentialsEmail,
  isMailConfigured,
  parseMailRecipients,
  sendMail,
} from "@/lib/mail";

export type DepartmentReviewerAccountStatus =
  | "created"
  | "role_assigned"
  | "unchanged"
  | "no_email"
  | "not_configured"
  | "failed";

export interface DepartmentReviewerAccountResult {
  email: string | null;
  status: DepartmentReviewerAccountStatus;
}

const BASE_URL = () =>
  (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    ""
  );

/**
 * Best-effort: garantiza que el destinatario de la revisión departamental
 * tenga una cuenta DEPARTMENT_REVIEWER con su departamento. Nunca lanza.
 */
export async function ensureDepartmentReviewerAccount(args: {
  supabase: SupabaseClient;
  recipients: string | null | undefined;
  department: string;
  departmentName: string;
  caseId: string;
  language?: "es" | "en";
}): Promise<DepartmentReviewerAccountResult[]> {
  const emails = parseMailRecipients(args.recipients);
  if (emails.length === 0) return [{ email: null, status: "no_email" }];
  if (!isUserAdminConfigured()) {
    return emails.map((email) => ({ email, status: "not_configured" }));
  }

  const language = args.language ?? "es";
  const appName =
    language === "es"
      ? "Portal de Debida Diligencia"
      : "Due Diligence Portal";
  const results: DepartmentReviewerAccountResult[] = [];

  for (const email of emails) {
    try {
      const result = await ensureOne({
        supabase: args.supabase,
        email,
        department: args.department,
        departmentName: args.departmentName,
        caseId: args.caseId,
        language,
        appName,
      });
      results.push(result);
    } catch {
      results.push({ email, status: "failed" });
    }
  }

  return results;
}

async function ensureOne(args: {
  supabase: SupabaseClient;
  email: string;
  department: string;
  departmentName: string;
  caseId: string;
  language: "es" | "en";
  appName: string;
}): Promise<DepartmentReviewerAccountResult> {
  const { supabase, email, department, departmentName, caseId } = args;
  const existingId = await findAdminAccountIdByEmail(email);
  const caseLink = `${BASE_URL()}/admin/reviews/${caseId}`;

  if (existingId) {
    const { data: roleRow } = await supabase
      .from("app_user_roles")
      .select("role, department")
      .eq("user_id", existingId)
      .maybeSingle();
    if (roleRow) {
      return { email, status: "unchanged" };
    }
    const { error: insertError } = await supabase
      .from("app_user_roles")
      .insert({
        user_id: existingId,
        role: "DEPARTMENT_REVIEWER",
        department,
      });
    if (insertError) return { email, status: "failed" };
    await sendCredentialsMail({
      email,
      password: null,
      kind: "role",
      departmentName,
      language: args.language,
      appName: args.appName,
      caseLink,
    });
    return { email, status: "role_assigned" };
  }

  const password = generateAdminPassword();
  const created = await createAdminAccount({ email, password });
  const { error: insertError } = await supabase.from("app_user_roles").insert({
    user_id: created.id,
    role: "DEPARTMENT_REVIEWER",
    department,
  });
  if (insertError) {
    return { email, status: "failed" };
  }
  await sendCredentialsMail({
    email,
    password,
    kind: "create",
    departmentName,
    language: args.language,
    appName: args.appName,
    caseLink,
  });
  return { email, status: "created" };
}

async function sendCredentialsMail(args: {
  email: string;
  password: string | null;
  kind: "create" | "role";
  departmentName: string;
  language: "es" | "en";
  appName: string;
  caseLink: string;
}): Promise<void> {
  if (!isMailConfigured()) return;
  await sendMail({
    ...adminCredentialsEmail(args.language, {
      email: args.email,
      password: args.password,
      loginLink: `${BASE_URL()}/admin/login`,
      caseLink: args.caseLink,
      kind: args.kind,
      department: args.departmentName,
      appName: args.appName,
    }),
    to: args.email,
  });
}
