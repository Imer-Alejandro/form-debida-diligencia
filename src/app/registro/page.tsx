"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Logo } from "@/components/ui";
import { LangToggle } from "@/components/LangToggle";
import { useDict, useI18n } from "@/lib/i18n";

function extractToken(input: string): string | null {
  const s = input.trim();
  const urlMatch = s.match(/\/i\/([A-Za-z0-9]+)/);
  const candidate = (urlMatch ? urlMatch[1] : s).toUpperCase();
  return /^[A-Z0-9]{8,}$/.test(candidate) ? candidate : null;
}

export default function RegistroPage() {
  const { t, lang } = useI18n();
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
    <div className="relative flex min-h-screen flex-col bg-[#f8fafc]">
      {/* Ambient Mesh Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[380px] w-[90%] max-w-4xl rounded-full bg-gradient-to-tr from-amber-200/40 via-rose-100/30 to-teal-100/35 blur-3xl opacity-80" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Inicio">
            <Logo dark />
          </Link>
          <LangToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full">
          <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-10 shadow-[0_4px_24px_rgba(10,25,47,0.06)]">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 text-white shadow-xs">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                  Acceso Cifrado
                </span>
                <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {d.inviteTitle}
                </h1>
              </div>
            </div>

            <p className="mt-4 text-xs sm:text-sm leading-relaxed text-slate-600">
              {d.inviteSubtitle}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700">
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
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 leading-relaxed">
                  {d.inviteError}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? t("common.loading") : d.inviteCta}
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-[#f8fafc] p-4 text-xs text-slate-500 space-y-2">
              <p className="leading-relaxed">
                <strong className="text-slate-700">¿Dónde encuentro este código?</strong> En el correo electrónico de invitación enviado por Sánchez Business &amp; Corp. Puede pegar la dirección web completa del enlace o solo el código alfanumérico.
              </p>
              <p className="pt-2 border-t border-slate-200/60 leading-relaxed">
                ¿Ya completó y envió su formulario?{" "}
                <Link href="/" className="font-semibold text-teal-700 hover:text-teal-800 underline">
                  Consulte el estado de su evaluación aquí →
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900 transition-colors"
            >
              ← Volver al Portal Principal
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-xs text-slate-400 sm:flex-row sm:px-6 sm:text-left">
          <p>© {new Date().getFullYear()} Sánchez Business &amp; Corp. · {lang === "es" ? "República Dominicana" : "Dominican Republic"}</p>
          <p>Portal Confidencial de Debida Diligencia</p>
        </div>
      </footer>
    </div>
  );
}