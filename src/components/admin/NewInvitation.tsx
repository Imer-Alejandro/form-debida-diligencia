"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;
    setSaving(true);
    setError(null);
    setMailInfo(null);
    const res = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company,
        email,
        note,
        language,
        expiresAt: expires ? new Date(expires).toISOString() : null,
      }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      emailStatus?: "sent" | "failed" | "skipped";
      mailError?: string;
    };
    if (!res.ok || !data.ok) {
      setError(t("admin.invitations.errorCreate"));
      setSaving(false);
      return;
    }
    setMailInfo(
      data.emailStatus === "sent"
        ? t("admin.invitations.mailSent")
        : data.emailStatus === "failed"
          ? `${t("admin.invitations.mailFailed")}${data.mailError ? ` (${data.mailError})` : ""}`
          : t("admin.invitations.mailSkipped")
    );
    setCompany("");
    setEmail("");
    setNote("");
    setExpires("");
    setSaving(false);
    router.refresh();
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
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={saving || !company.trim()}>
          {saving ? t("admin.invitations.creating") : t("admin.invitations.create")}
        </Button>
      </div>
    </form>
  );
}