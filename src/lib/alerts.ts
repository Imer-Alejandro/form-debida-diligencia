import "server-only";
import { getAdminApi, isAdminApiConfigured } from "@/lib/supabase/admin";
import { makeToken } from "@/lib/ids";
import {
  MailNotConfiguredError,
  expiryInternalEmail,
  expirySupplierEmail,
  formReminderEmail,
  isMailConfigured,
  sendMail,
} from "@/lib/mail";

type SupabaseAdmin = ReturnType<typeof getAdminApi>;

export type AlertKind =
  | "REGISTRY_EXPIRING"
  | "EXPORTER_CODE_EXPIRING"
  | "FORM_INCOMPLETE";

interface AlertCandidate {
  kind: AlertKind;
  audience: "SUPPLIER" | "PURCHASING";
  registration_id: string | null;
  invitation_id: string | null;
  recipient: string | null;
  language: "es" | "en";
  company: string | null;
  reference: string | null;
  date: string | null;
  days: number;
  due_at: string | null;
  token?: string | null;
  dedupe_key: string;
}

interface AlertRow {
  id: number;
  kind: AlertKind;
  audience: "SUPPLIER" | "PURCHASING";
  registration_id: string | null;
  invitation_id: string | null;
  recipient: string | null;
  language: "es" | "en";
  context: Record<string, unknown> | null;
  due_at: string | null;
  status: string;
  attempts: number;
  dedupe_key: string;
}

export interface AlertSummary {
  candidates: number;
  enqueued: number;
  sent: number;
  failed: number;
  skipped: number;
  mailConfigured: boolean;
  purchasingRecipients: string[];
}

function appName(language: "es" | "en"): string {
  return language === "en"
    ? "Due Diligence Form"
    : "Formulario de Debida Diligencia";
}

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}

function expiryDays(): number[] {
  const raw = process.env.ALERTS_EXPIRY_DAYS ?? "30,15,5";
  const days = raw
    .split(",")
    .map((v) => parseInt(v.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return days.length ? days : [30, 15, 5];
}

function formMinAgeDays(): number {
  const n = parseInt(process.env.ALERTS_FORM_MIN_AGE_DAYS ?? "3", 10);
  return Number.isFinite(n) && n >= 0 ? n : 3;
}

export function purchasingRecipients(): string[] {
  return (process.env.PURCHASING_EMAILS ?? process.env.PURCHASING_EMAIL ?? "")
    .split(/[,;]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function autoRenewEnabled(): boolean {
  return (process.env.ALERTS_AUTO_RENEW ?? "true").toLowerCase() !== "false";
}

/**
 * Returns an editable renewal link for a supplier whose registration is
 * expiring. If the registration is already open for changes it reuses the
 * existing token; otherwise it opens a new 30-day invitation and moves the
 * registration to SOLICITUD_CAMBIOS so the supplier can resubmit.
 */
async function ensureRenewalLink(
  supabase: SupabaseAdmin,
  registrationId: string,
  supplierEmail: string | null,
  company: string | null
): Promise<string | null> {
  const { data: reg } = await supabase
    .from("supplier_registrations")
    .select("id, status, invitation_token, language, company_name, reference_no")
    .eq("id", registrationId)
    .maybeSingle();
  if (!reg) return null;

  if (reg.status === "SOLICITUD_CAMBIOS" && reg.invitation_token) {
    const { data: inv } = await supabase
      .from("invitations")
      .select("token, expires_at")
      .eq("token", reg.invitation_token)
      .maybeSingle();
    if (inv && (!inv.expires_at || new Date(inv.expires_at) > new Date())) {
      return `${appBaseUrl()}/i/${inv.token}`;
    }
  }

  const token = makeToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error: invErr } = await supabase.from("invitations").insert({
    token,
    supplier_email: supplierEmail,
    supplier_name: company ?? reg.company_name ?? "",
    note: "Renovación automática: actualice su registro mercantil / código de exportador y vuelva a enviar el formulario.",
    status: "sent",
    language: reg.language ?? "es",
    created_by: null,
    expires_at: expiresAt,
  });
  if (invErr) return null;

  await supabase
    .from("supplier_registrations")
    .update({
      status: "SOLICITUD_CAMBIOS",
      invitation_token: token,
      updated_at: new Date().toISOString(),
    })
    .eq("id", registrationId);

  return `${appBaseUrl()}/i/${token}`;
}

/**
 * Runs the whole alert cycle: discover due reminders, enqueue the new ones
 * (deduplicated) and e-mail every pending message. Safe to call repeatedly.
 */
export async function runAlertEngine(): Promise<AlertSummary> {
  const summary: AlertSummary = {
    candidates: 0,
    enqueued: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    mailConfigured: isMailConfigured(),
    purchasingRecipients: purchasingRecipients(),
  };

  if (!isAdminApiConfigured()) throw new Error("admin_api_not_configured");
  const supabase = getAdminApi();

  // 1) Discover candidates.
  const { data: rawCandidates, error: candErr } = await supabase.rpc(
    "get_alert_candidates",
    { p_expiry_days: expiryDays(), p_form_min_age_days: formMinAgeDays() }
  );
  if (candErr) throw candErr;

  const candidates = (rawCandidates ?? []) as AlertCandidate[];
  summary.candidates = candidates.length;

  // 2) Enqueue the ones we have not created yet.
  if (candidates.length) {
    const keys = candidates.map((c) => c.dedupe_key);
    const { data: existing } = await supabase
      .from("supplier_alerts")
      .select("dedupe_key")
      .in("dedupe_key", keys);
    const seen = new Set((existing ?? []).map((r: { dedupe_key: string }) => r.dedupe_key));

    const rows = candidates
      .filter((c) => !seen.has(c.dedupe_key))
      .map((c) => ({
        kind: c.kind,
        channel: "EMAIL",
        audience: c.audience,
        registration_id: c.registration_id,
        invitation_id: c.invitation_id,
        recipient: c.audience === "SUPPLIER" ? c.recipient : null,
        language: c.language ?? "es",
        context: {
          company: c.company,
          reference: c.reference,
          date: c.date,
          days: c.days,
          token: c.token ?? null,
          kind: c.kind,
          audience: c.audience,
        },
        due_at: c.due_at,
        status: "PENDING",
        dedupe_key: c.dedupe_key,
      }));

    if (rows.length) {
      const { error: insErr } = await supabase
        .from("supplier_alerts")
        .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
      if (insErr) throw insErr;
      summary.enqueued = rows.length;
    }
  }

  // 3) Nothing to send if SMTP is unavailable: leave the queue intact.
  if (!isMailConfigured()) return summary;

  // 4) Send every pending alert.
  const { data: pending, error: pendErr } = await supabase
    .from("supplier_alerts")
    .select(
      "id, kind, audience, registration_id, invitation_id, recipient, language, context, due_at, status, attempts, dedupe_key"
    )
    .eq("status", "PENDING")
    .order("created_at", { ascending: true })
    .limit(200);
  if (pendErr) throw pendErr;

  for (const alert of (pending ?? []) as AlertRow[]) {
    const ctx = (alert.context ?? {}) as Record<string, unknown>;
    const language: "es" | "en" = alert.language === "en" ? "en" : "es";
    const company = (ctx.company as string) ?? "proveedor";
    const reference = (ctx.reference as string) ?? null;
    const date = (ctx.date as string) ?? "";
    const days = typeof ctx.days === "number" ? ctx.days : 0;
    const kind: "registry" | "exporter" =
      alert.kind === "EXPORTER_CODE_EXPIRING" ? "exporter" : "registry";

    let to: string;
    let message: ReturnType<typeof expirySupplierEmail>;

    if (alert.audience === "PURCHASING") {
      if (!summary.purchasingRecipients.length) {
        await supabase
          .from("supplier_alerts")
          .update({ status: "SKIPPED", error: "no_purchasing_recipient" })
          .eq("id", alert.id);
        summary.skipped++;
        continue;
      }
      to = summary.purchasingRecipients.join(", ");
      message = expiryInternalEmail({
        company,
        reference,
        kind,
        date,
        days,
        link: alert.registration_id
          ? `${appBaseUrl()}/admin/suppliers/${alert.registration_id}`
          : undefined,
        appName: appName(language),
      });
    } else if (alert.kind === "FORM_INCOMPLETE") {
      if (!alert.recipient) {
        await supabase
          .from("supplier_alerts")
          .update({ status: "SKIPPED", error: "no_recipient" })
          .eq("id", alert.id);
        summary.skipped++;
        continue;
      }
      to = alert.recipient;
      const token = (ctx.token as string) ?? null;
      const link = token ? `${appBaseUrl()}/i/${token}` : appBaseUrl();
      message = formReminderEmail(language, {
        company,
        link,
        days,
        appName: appName(language),
      });
    } else {
      if (!alert.recipient) {
        await supabase
          .from("supplier_alerts")
          .update({ status: "SKIPPED", error: "no_recipient" })
          .eq("id", alert.id);
        summary.skipped++;
        continue;
      }
      to = alert.recipient;
      let link: string | undefined;
      if (autoRenewEnabled() && alert.registration_id) {
        link =
          (await ensureRenewalLink(supabase, alert.registration_id, alert.recipient, company)) ??
          undefined;
      }
      message = expirySupplierEmail(language, {
        company,
        kind,
        date,
        days,
        link,
        appName: appName(language),
      });
    }

    try {
      await sendMail({ ...message, to });
      await supabase
        .from("supplier_alerts")
        .update({
          status: "SENT",
          recipient: to,
          subject: message.subject,
          body: message.text,
          attempts: alert.attempts + 1,
          sent_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", alert.id);
      await supabase.from("activity_log").insert({
        actor: "system",
        action: "alert_sent",
        subject_type: alert.registration_id ? "registration" : "invitation",
        subject_id: (alert.registration_id ?? alert.invitation_id ?? "").toString(),
        detail: { kind: alert.kind, audience: alert.audience, to },
      });
      summary.sent++;
    } catch (e) {
      const notConfigured = e instanceof MailNotConfiguredError;
      await supabase
        .from("supplier_alerts")
        .update({
          status: notConfigured ? "PENDING" : "FAILED",
          attempts: alert.attempts + 1,
          error: e instanceof Error ? e.message : "unknown",
        })
        .eq("id", alert.id);
      if (notConfigured) break;
      await supabase.from("activity_log").insert({
        actor: "system",
        action: "alert_failed",
        subject_type: alert.registration_id ? "registration" : "invitation",
        subject_id: (alert.registration_id ?? alert.invitation_id ?? "").toString(),
        detail: { kind: alert.kind, audience: alert.audience, error: e instanceof Error ? e.message : "unknown" },
      });
      summary.failed++;
    }
  }

  return summary;
}
