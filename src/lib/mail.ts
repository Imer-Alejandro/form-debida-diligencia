import nodemailer from "nodemailer";

/** SMTP configuration for Microsoft 365 / Office 365 corporate mailboxes. */
const SMTP_HOST = () => process.env.SMTP_HOST ?? "";
const SMTP_PORT = () => Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = () => process.env.SMTP_USER ?? "";
const SMTP_PASS = () => process.env.SMTP_PASS ?? "";
export const MAIL_FROM = () => process.env.MAIL_FROM ?? SMTP_USER();

export function isMailConfigured(): boolean {
  return Boolean(SMTP_HOST() && SMTP_USER() && SMTP_PASS());
}

export class MailNotConfiguredError extends Error {
  constructor() {
    super("SMTP not configured");
    this.name = "MailNotConfiguredError";
  }
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(msg: MailMessage): Promise<void> {
  if (!isMailConfigured()) throw new MailNotConfiguredError();
  const transport = nodemailer.createTransport({
    host: SMTP_HOST(),
    port: SMTP_PORT(),
    secure: false,
    requireTLS: true,
    auth: { user: SMTP_USER(), pass: SMTP_PASS() },
  });
  try {
    await transport.sendMail({
      from: { name: "Sanchez Business Corp", address: MAIL_FROM() },
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
  } finally {
    transport.close();
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function invitationEmail(
  language: "es" | "en",
  args: {
    company: string;
    link: string;
    note?: string;
    expiresAt?: string | null;
    appName: string;
  }
): MailMessage {
  const isEs = language === "es";
  const title = isEs
    ? "Invitación al Formulario de Debida Diligencia"
    : "Invitation to the Due Diligence Form";
  const hello = isEs ? `Estimado(a) ${esc(args.company)},` : `Dear ${esc(args.company)},`;
  const intro = isEs
    ? "Le invitamos a completar el formulario de debida diligencia de proveedores de Sanchez Business Corp. Para comenzar, abra el siguiente enlace y complete el registro:"
    : "You are invited to complete the Sanchez Business Corp supplier due diligence form. To get started, open the link below and complete the registration:";
  const noteLabel = isEs ? "Nota de su contacto:" : "Message from your contact:";
  const expiresLabel = isEs ? "Este enlace es válido hasta:" : "This link is valid until:";
  const footer = isEs
    ? "Si tiene dudas, contacte a su equipo de compras de Sanchez Business Corp."
    : "If you have any questions, contact your Sanchez Business Corp procurement team.";
  const expires = args.expiresAt
    ? new Date(args.expiresAt).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f2">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;border:1px solid #e5e2dd">
      <tr><td style="padding:28px 32px;border-bottom:1px solid #e5e2dd">
        <p style="margin:0;font-family:Georgia,serif;font-size:20px;font-weight:700;color:#0a1c31">${esc(args.appName)}</p>
      </td></tr>
      <tr><td style="padding:28px 32px">
        <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:15px;color:#333333">${hello}</p>
        <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#444444">${intro}</p>
        <p style="margin:0 0 20px;text-align:center">
          <a href="${esc(args.link)}" style="display:inline-block;background:#0a1c31;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-family:Arial,sans-serif;font-size:14px;font-weight:700">${isEs ? "Iniciar registro" : "Start registration"}</a>
        </p>
        <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:13px;color:#777777;word-break:break-all">${esc(args.link)}</p>
        ${args.note ? `<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:14px;color:#444444"><strong>${noteLabel}</strong> ${esc(args.note)}</p>` : ""}
        ${expires ? `<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:13px;color:#777777">${expiresLabel} <strong>${esc(expires)}</strong></p>` : ""}
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #e5e2dd">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#999999">${footer}</p>
      </td></tr>
    </table>
  </td></tr>
</table>`;

  return { to: "", subject: title, html, text: `${hello}\n\n${intro}\n\n${args.link}\n` };
}