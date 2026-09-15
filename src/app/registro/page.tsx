"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { useDict, useI18n } from "@/lib/i18n";
import { WizardShell } from "@/components/wizard/WizardShell";

function extractToken(input: string): string | null {
  const s = input.trim();
  const urlMatch = s.match(/\/i\/([A-Za-z0-9]+)/);
  const candidate = (urlMatch ? urlMatch[1] : s).toUpperCase();
  return /^[A-Z0-9]{8,}$/.test(candidate) ? candidate : null;
}

export default function RegistroPage() {
  const { t } = useI18n();
  const dict = useDict();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const d = dict.landing;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(false);
    const token = extractToken(value);
    if (!token) {
      setError(true);
      return;
    }
    setLoading(true);
    router.push(`/i/${token}`);
  };

  return (
    <WizardShell>
      <div className="mx-auto max-w-lg">
        <div className="rounded-3xl border border-navy-800/10 bg-white p-6 shadow-[0_1px_2px_rgba(10,28,49,0.04)] sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-navy-900">
            {d.inviteTitle}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
            {d.inviteSubtitle}
          </p>
          <form onSubmit={(e) => submit(e)} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">
                {d.inviteLabel}
              </span>
              <Input
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(false);
                }}
                placeholder={d.invitePlaceholder}
                invalid={error}
                autoComplete="off"
                autoFocus
              />
            </label>
            {error && (
              <p className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-[13px] text-danger">
                {d.inviteError}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? t("common.loading") : d.inviteCta}
            </Button>
          </form>
          <p className="mt-5 text-[11.5px] leading-relaxed text-ink-muted">
            {d.inviteHint}
          </p>
        </div>
        <p className="mt-6 text-center">
          <Link href="/" className="text-[13px] font-medium text-navy-800 hover:underline">
            ← {t("common.back")}
          </Link>
        </p>
      </div>
    </WizardShell>
  );
}