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

export function parseMailRecipients(value: string | null | undefined): string[] {
  return [
    ...new Set(
      (value ?? "")
        .split(/[,;]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
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
      from: { name: "Sánchez Business & Corp.", address: MAIL_FROM() },
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
    ? "Le invitamos a completar el formulario de debida diligencia de proveedores de Sánchez Business & Corp. Para comenzar, abra el siguiente enlace y complete el registro:"
    : "You are invited to complete the Sánchez Business & Corp. supplier due diligence form. To get started, open the link below and complete the registration:";
  const noteLabel = isEs ? "Nota de su contacto:" : "Message from your contact:";
  const expiresLabel = isEs ? "Este enlace es válido hasta:" : "This link is valid until:";
  const footer = isEs
    ? "Si tiene dudas, contacte a su equipo de compras de Sánchez Business & Corp."
    : "If you have any questions, contact your Sánchez Business & Corp. procurement team.";
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

export function requestChangesEmail(
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
    ? "Solicitud de cambios - Formulario de Debida Diligencia"
    : "Changes requested - Due Diligence Form";
  const hello = isEs ? `Estimado(a) ${esc(args.company)},` : `Dear ${esc(args.company)},`;
  const intro = isEs
    ? "Su solicitud de proveedor de Sánchez Business & Corp. necesita algunos ajustes. Por favor abra el enlace a continuación para revisar las observaciones, corregir la información y volver a enviar el formulario:"
    : "Your Sánchez Business & Corp. supplier application needs a few adjustments. Please open the link below to review the notes, correct the information and resubmit the form:";
  const noteLabel = isEs ? "Observación del equipo de compras:" : "Message from the procurement team:";
  const expiresLabel = isEs ? "Este enlace es válido hasta:" : "This link is valid until:";
  const footer = isEs
    ? "Si tiene dudas, contacte a su equipo de compras de Sánchez Business & Corp."
    : "If you have any questions, contact your Sánchez Business & Corp. procurement team.";
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
        ${args.note ? `<p style="margin:0 0 20px;padding:14px 16px;border-left:3px solid #0a1c31;background:#f6f5f2;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333333"><strong>${noteLabel}</strong><br style="line-height:8px">${esc(args.note)}</p>` : ""}
        <p style="margin:0 0 20px;text-align:center">
          <a href="${esc(args.link)}" style="display:inline-block;background:#0a1c31;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-family:Arial,sans-serif;font-size:14px;font-weight:700">${isEs ? "Volver a enviar el formulario" : "Resubmit the form"}</a>
        </p>
        <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:13px;color:#777777;word-break:break-all">${esc(args.link)}</p>
        ${expires ? `<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:13px;color:#777777">${expiresLabel} <strong>${esc(expires)}</strong></p>` : ""}
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #e5e2dd">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#999999">${footer}</p>
      </td></tr>
    </table>
  </td></tr>
</table>`;

  return {
    to: "",
    subject: title,
    html,
    text: `${hello}\n\n${intro}\n\n${args.note ? `${noteLabel}\n${args.note}\n\n` : ""}${args.link}\n${expires ? `${expiresLabel} ${expires}\n` : ""}`,
  };
}

export function departmentReviewEmail(args: {
  company: string;
  reference: string | null;
  department: string;
  requestReason: string | null;
  link: string;
}): MailMessage {
  const company = esc(args.company);
  const department = esc(args.department);
  const reference = args.reference ? esc(args.reference) : "";
  const reason = args.requestReason ? esc(args.requestReason) : "";
  const subject = `Nueva revisión asignada a ${args.department}: ${args.company}`;
  const text = [
    `Se envió al responsable de ${args.department} una solicitud para revisar el expediente del proveedor ${args.company}.`,
    reference ? `Referencia: ${args.reference}` : "",
    reason ? `Motivo de la solicitud: ${args.requestReason}` : "",
    "El plazo SLA de tres días hábiles inicia cuando se confirme la recepción del expediente completo.",
    `Abra el expediente del proveedor y registre la revisión en el portal: ${args.link}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const html = `
<p>Se envió al responsable de <strong>${department}</strong> una solicitud para revisar el expediente del proveedor <strong>${company}</strong>.</p>
${reference ? `<p>Referencia: ${reference}</p>` : ""}
${reason ? `<p><strong>Motivo de la solicitud:</strong> ${reason}</p>` : ""}
<p>El plazo SLA de tres días hábiles inicia cuando se confirme la recepción del expediente completo.</p>
<p><a href="${esc(args.link)}">Abrir expediente y registrar la revisión</a></p>`;
  return { to: "", subject, text, html };
}

export function departmentSlaEscalationEmail(args: {
  company: string;
  reference: string | null;
  department: string;
  dueAt: string;
  link: string;
}): MailMessage {
  const company = esc(args.company);
  const department = esc(args.department);
  const reference = args.reference ? esc(args.reference) : "";
  const dueAt = esc(args.dueAt);
  const subject = `SLA vencido: revisión de ${args.department}`;
  const text = [
    `La revisión de ${args.department} para ${args.company} superó el SLA de tres días hábiles.`,
    reference ? `Referencia: ${args.reference}` : "",
    `Vencimiento: ${args.dueAt}`,
    `Panel de seguimiento: ${args.link}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const html = `
<p>La revisión de <strong>${department}</strong> para <strong>${company}</strong> superó el SLA de tres días hábiles.</p>
${reference ? `<p>Referencia: ${reference}</p>` : ""}
<p>Vencimiento: ${dueAt}</p>
<p><a href="${esc(args.link)}">Abrir panel de seguimiento</a></p>`;
  return { to: "", subject, text, html };
}

/** Shared HTML shell for the alert e-mails. */
function alertShell(args: { appName: string; intro: string; body: string; cta?: { label: string; link: string }; footer: string }): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f2">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;border:1px solid #e5e2dd">
      <tr><td style="padding:28px 32px;border-bottom:1px solid #e5e2dd">
        <p style="margin:0;font-family:Georgia,serif;font-size:20px;font-weight:700;color:#0a1c31">${esc(args.appName)}</p>
      </td></tr>
      <tr><td style="padding:28px 32px">
        <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#444444">${esc(args.intro)}</p>
        ${args.body}
        ${args.cta ? `<p style="margin:24px 0 8px;text-align:center"><a href="${esc(args.cta.link)}" style="display:inline-block;background:#0a1c31;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-family:Arial,sans-serif;font-size:14px;font-weight:700">${esc(args.cta.label)}</a></p><p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#777777;word-break:break-all;text-align:center">${esc(args.cta.link)}</p>` : ""}
      </td></tr>
      <tr><td style="padding:20px 32px;border-top:1px solid #e5e2dd">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#999999">${esc(args.footer)}</p>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function formatDate(value: string, language: "es" | "en"): string {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Reminds a supplier that a registration document is about to expire. */
export function expirySupplierEmail(
  language: "es" | "en",
  args: { company: string; kind: "registry" | "exporter"; date: string; days: number; link?: string; appName: string }
): MailMessage {
  const isEs = language === "es";
  const what = args.kind === "exporter"
    ? isEs ? "el código de exportador" : "the exporter code"
    : isEs ? "el registro mercantil" : "the commercial registry";
  const date = formatDate(args.date, language);
  const title = isEs ? `Aviso de vencimiento: ${args.kind === "exporter" ? "código de exportador" : "registro mercantil"}` : `Expiry notice: ${args.kind === "exporter" ? "exporter code" : "commercial registry"}`;
  const hello = isEs ? `Estimado(a) ${esc(args.company)},` : `Dear ${esc(args.company)},`;
  const intro = isEs
    ? `Le informamos que ${what} de su empresa vencerá en ${args.days} día(s), el ${date}.`
    : `This is a reminder that ${what} for your company will expire in ${args.days} day(s), on ${date}.`;
  const ask = isEs
    ? "Le solicitamos actualizar su registro enviado y adjuntar el documento vigente lo antes posible."
    : "Please update your submitted registration and attach the current document as soon as possible.";
  const footer = isEs
    ? "Si tiene dudas, contacte a su equipo de compras de Sánchez Business & Corp."
    : "If you have any questions, contact your Sánchez Business & Corp. procurement team.";
  const body = `<p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#444444">${esc(hello)}</p><p style="margin:0;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#444444">${esc(ask)}</p>`;
  return {
    to: "",
    subject: title,
    html: alertShell({
      appName: args.appName,
      intro,
      body,
      cta: args.link ? { label: isEs ? "Actualizar registro" : "Update registration", link: args.link } : undefined,
      footer,
    }),
    text: `${hello}\n\n${intro}\n\n${ask}\n${args.link ? `\n${args.link}\n` : ""}`,
  };
}

/** Internal heads-up to the purchasing team that a document is expiring. */
export function expiryInternalEmail(args: { company: string; reference?: string | null; kind: "registry" | "exporter"; date: string; days: number; link?: string; appName: string }): MailMessage {
  const what = args.kind === "exporter" ? "el código de exportador" : "el registro mercantil";
  const date = formatDate(args.date, "es");
  const title = `Vencimiento próximo: ${args.company}`;
  const intro = `El ${what} de ${args.company}${args.reference ? ` (${args.reference})` : ""} vence en ${args.days} día(s), el ${date}.`;
  const body = `<p style="margin:0;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#444444">Se ha enviado un aviso automático al proveedor para que actualice su registro. Dé seguimiento a la actualización.</p>`;
  return {
    to: "",
    subject: title,
    html: alertShell({
      appName: args.appName,
      intro,
      body,
      cta: args.link ? { label: "Ver proveedor", link: args.link } : undefined,
      footer: "Notificación automática del sistema de debida diligencia.",
    }),
    text: `${intro}\n\nSe ha enviado un aviso automático al proveedor para que actualice su registro.${args.link ? `\n\n${args.link}` : ""}`,
  };
}

/** Weekly nudge to a supplier who has not completed (or started) the form. */
export function formReminderEmail(
  language: "es" | "en",
  args: { company: string; link: string; days: number; appName: string }
): MailMessage {
  const isEs = language === "es";
  const title = isEs ? "Recordatorio: complete su formulario de debida diligencia" : "Reminder: complete your due diligence form";
  const hello = isEs ? `Estimado(a) ${esc(args.company)},` : `Dear ${esc(args.company)},`;
  const intro = isEs
    ? "Nos gustaría recordarle que aún no hemos recibido su formulario de debida diligencia de proveedores de Sánchez Business & Corp."
    : "We would like to remind you that we have not yet received your Sánchez Business & Corp. supplier due diligence form.";
  const ask = isEs
    ? "Puede continuar donde lo dejó usando el siguiente enlace. Si ya lo envió, ignore este mensaje."
    : "You can continue where you left off using the link below. If you already submitted it, please ignore this message.";
  const footer = isEs
    ? "Si tiene dudas, contacte a su equipo de compras de Sánchez Business & Corp."
    : "If you have any questions, contact your Sánchez Business & Corp. procurement team.";
  const body = `<p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#444444">${esc(hello)}</p><p style="margin:0;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#444444">${esc(ask)}</p>`;
  return {
    to: "",
    subject: title,
    html: alertShell({
      appName: args.appName,
      intro,
      body,
      cta: { label: isEs ? "Continuar el formulario" : "Continue the form", link: args.link },
      footer,
    }),
    text: `${hello}\n\n${intro}\n\n${ask}\n\n${args.link}\n`,
  };
}

/** Confirms to the supplier that their due diligence form was received. */
export function submissionReceivedEmail(
  language: "es" | "en",
  args: { company: string; reference?: string | null; appName: string }
): MailMessage {
  const isEs = language === "es";
  const title = isEs ? "Hemos recibido su formulario - Debida Diligencia" : "We have received your form - Due Diligence";
  const hello = isEs ? `Estimado(a) ${esc(args.company)},` : `Dear ${esc(args.company)},`;
  const intro = isEs
    ? `Gracias por completar el formulario de debida diligencia de proveedores de Sánchez Business & Corp. Confirmamos la recepción de la información de ${esc(args.company)}.`
    : `Thank you for completing the Sánchez Business & Corp. supplier due diligence form. We confirm receipt of the information for ${esc(args.company)}.`;
  const ask = isEs
    ? `Su registro quedó en revisión por nuestro equipo de compras.${args.reference ? ` Número de referencia: ${esc(args.reference)}.` : ""} Si necesitamos información adicional, nos pondremos en contacto.`
    : `Your registration is now under review by our procurement team.${args.reference ? ` Reference number: ${esc(args.reference)}.` : ""} If we need any additional information, we will contact you.`;
  const footer = isEs
    ? "Si tiene dudas, contacte a su equipo de compras de Sánchez Business & Corp."
    : "If you have any questions, contact your Sánchez Business & Corp. procurement team.";
  const body = `<p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#444444">${hello}</p><p style="margin:0;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#444444">${ask}</p>`;
  return {
    to: "",
    subject: title,
    html: alertShell({ appName: args.appName, intro, body, footer }),
    text: `${hello}\n\n${intro}\n\n${ask}\n`,
  };
}