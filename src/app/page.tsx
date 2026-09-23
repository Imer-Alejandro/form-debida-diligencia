"use client";

import Link from "next/link";
import { Logo } from "@/components/ui";
import { LangToggle } from "@/components/LangToggle";
import { useDict, useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t, lang } = useI18n();
  const dict = useDict();

  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc]">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo dark />
          <LangToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <section className="mx-auto max-w-3xl pb-12 pt-14 text-center sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/90 px-4 py-1.5 text-xs font-semibold tracking-wide text-amber-800 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            República Dominicana
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-600 sm:text-lg">
            {t("landing.heroSubtitle")}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-xs leading-relaxed text-slate-400">
            {t("landing.introInstruction")}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-navy-900 px-8 text-sm font-semibold text-white shadow-xs transition-all hover:bg-navy-800 hover:shadow-sm active:scale-[0.99]"
            >
              {t("landing.ctaStart")} →
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {t("landing.howTitle")}
            </a>
          </div>
          <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
            {t("landing.privacyNote")}
          </p>
        </section>

        <section id="como-funciona" className="scroll-mt-20 pb-16 pt-4 sm:pb-24">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Guía Paso a Paso</span>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              {t("landing.howTitle")}
            </h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {(dict.landing.steps as unknown as { title: string; text: string }[]).map(
              (s, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-sm transition-shadow"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-800">
                    0{i + 1}
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-slate-900">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {s.text}
                  </p>
                </div>
              )
            )}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/registro"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-navy-900 px-8 text-sm font-semibold text-white shadow-xs transition-all hover:bg-navy-800 hover:shadow-sm"
            >
              {t("landing.ctaStart")} →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-7 text-center text-xs text-slate-400 sm:flex-row sm:px-6 sm:text-left">
          <p>
            © {new Date().getFullYear()} Sanchez Business Corp ·{" "}
            {lang === "es" ? "República Dominicana" : "Dominican Republic"}
          </p>
        </div>
      </footer>
    </div>
  );
}