"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useI18n } from "@/lib/i18n";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";

export function NewInvitation() {
  const { t } = useI18n();
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [expires, setExpires] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mailInfo, setMailInfo] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [qrError, setQrError] = useState(false);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;
    setSaving(true);
    setError(null);
    setMailInfo(null);
    setCreatedUrl(null);
    setCopyError(false);
    setCopied(false);
    setQrDataUrl(null);
    setShowQr(false);
    setQrError(false);
    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          email,
          note,
          language,
          expiresAt: expires
            ? new Date(`${expires}T23:59:59`).toISOString()
            : null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        emailStatus?: "sent" | "failed" | "skipped";
        mailError?: string;
        url?: string;
      };
      if (!res.ok || !data.ok) {
        setError(t("admin.invitations.errorCreate"));
        return;
      }
      setMailInfo(
        data.emailStatus === "sent"
          ? t("admin.invitations.mailSent")
          : data.emailStatus === "failed"
            ? `${t("admin.invitations.mailFailed")}${data.mailError ? ` (${data.mailError})` : ""}`
            : t("admin.invitations.mailSkipped")
      );
      if (data.url) setCreatedUrl(data.url);
      setCompany("");
      setEmail("");
      setNote("");
      setExpires("");
      router.refresh();
    } catch {
      setError(t("admin.invitations.errorCreate"));
    } finally {
      setSaving(false);
    }
  };

  const copyCreatedUrl = async () => {
    if (!createdUrl) return;
    try {
      const absoluteUrl = new URL(createdUrl, window.location.origin).toString();
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };

  const toggleQr = async () => {
    if (qrDataUrl) {
      setShowQr((current) => !current);
      return;
    }
    if (!createdUrl) return;

    setGeneratingQr(true);
    setQrError(false);
    try {
      const absoluteUrl = new URL(createdUrl, window.location.origin).toString();
      const dataUrl = await QRCode.toDataURL(absoluteUrl, {
        width: 384,
        margin: 2,
        color: { dark: "#0a1c31", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
      setShowQr(true);
    } catch {
      setQrError(true);
    } finally {
      setGeneratingQr(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void create(e)}
      className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("admin.invitations.company")} required>
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="ACME Construction, S.R.L."
            required
          />
        </Field>
        <Field label={t("admin.invitations.email")}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="proveedor@empresa.com"
          />
        </Field>
      </div>
      <Field label={t("admin.invitations.note")}>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("admin.invitations.language")}>
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "es" | "en")}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </Select>
        </Field>
        <Field label={t("admin.invitations.expires")}>
          <Input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
        </Field>
      </div>
      {error && (
        <p className="rounded-xl border border-rose-200/80 bg-rose-50/70 px-4 py-3 text-xs text-rose-600 font-medium">
          {error}
        </p>
      )}
      {mailInfo && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 font-medium">
          {mailInfo}
        </p>
      )}
      {createdUrl && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
          <p className="text-xs font-semibold text-emerald-900">{t("admin.invitations.linkReady")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 break-all text-[11px] text-slate-700">{createdUrl}</code>
            <Button type="button" size="sm" variant="secondary" onClick={() => void copyCreatedUrl()}>
              {copied ? t("admin.invitations.copied") : t("admin.invitations.copyLink")}
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                t("admin.invitations.whatsAppMessage", { url: createdUrl })
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-700"
            >
              {t("admin.invitations.sendWhatsApp")}
            </a>
            <Button type="button" size="sm" variant="secondary" onClick={() => void toggleQr()} disabled={generatingQr}>
              {generatingQr
                ? t("admin.invitations.generatingQr")
                : showQr
                  ? t("admin.invitations.hideQr")
                  : t("admin.invitations.showQr")}
            </Button>
          </div>
          {copyError && <p role="alert" className="mt-2 text-xs text-rose-700">{t("admin.invitations.copyFailed")}</p>}
          {qrError && <p role="alert" className="mt-2 text-xs text-rose-700">{t("admin.invitations.qrFailed")}</p>}
          {showQr && qrDataUrl && (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt={t("admin.invitations.qrFor")} width={192} height={192} className="rounded-xl border border-slate-200 bg-white p-2" />
              <a
                href={qrDataUrl}
                download="invitacion-qr.png"
                className="text-xs font-medium text-navy-800 underline underline-offset-2"
              >
                {t("admin.invitations.downloadQr")}
              </a>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={saving || !company.trim()}>
          {saving ? t("admin.invitations.creating") : t("admin.invitations.create")}
        </Button>
      </div>
    </form>
  );
}