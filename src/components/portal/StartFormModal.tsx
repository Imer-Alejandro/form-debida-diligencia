"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal, Input, Button } from "@/components/ui";
import { useI18n, useDict } from "@/lib/i18n";

interface StartFormModalProps {
  open: boolean;
  onClose: () => void;
}

function extractToken(input: string): string | null {
  const s = input.trim();
  const urlMatch = s.match(/\/i\/([A-Za-z0-9]+)/);
  const candidate = (urlMatch ? urlMatch[1] : s).toUpperCase();
  return /^[A-Z0-9]{8,}$/.test(candidate) ? candidate : null;
}

export function StartFormModal({ open, onClose }: StartFormModalProps) {
  const router = useRouter();
  const { t } = useI18n();
  const dict = useDict();
  const m = dict.portal.modals;

  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

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
    <Modal
      open={open}
      onClose={onClose}
      title={m.startTitle}
      maxWidth="max-w-lg"
    >
      <div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {m.startIntro}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              {m.startLabel}
            </span>
            <Input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(false);
              }}
              placeholder={m.startPlaceholder}
              invalid={error}
              autoComplete="off"
              autoFocus
            />
          </label>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 leading-relaxed">
              {m.startError}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? m.startLoading : m.startCta}
          </Button>
        </form>

        <div className="mt-6 rounded-xl border border-slate-100 bg-[#f8fafc] p-3.5 text-xs text-slate-500">
          <span className="font-semibold text-slate-700 block mb-1">
            {m.startNoInvite}
          </span>
          {m.startNoInviteDesc}
        </div>
      </div>
    </Modal>
  );
}
