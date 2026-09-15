"use client";

import Link from "next/link";
import { Logo } from "@/components/ui";
import { LangToggle } from "@/components/LangToggle";
import { useDict, useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t, lang } = useI18n();
  const dict = useDict();

  return (
    <div className="flex min-h-screen flex-col bg-bone-50">
      <header className="sticky top-0 z-30 border-b border-navy-800/10 bg-bone-50/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo dark />
          <LangToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        <section className="mx-auto max-w-3xl pb-12 pt-12 text-center sm:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-400/15 px-4 py-1.5 text-[12px] font-medium tracking-wide text-[#6b5520]">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
            República Dominicana
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-navy-900 sm:text-5xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-soft sm:text-lg">
            {t("landing.heroSubtitle")}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
            {t("landing.introInstruction")}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-navy-800 px-8 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-navy-700"
            >
              {t("landing.ctaStart")} →
            </Link>
            <a
              href="#como-funciona"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-navy-800/15 bg-white px-8 text-[15px] font-semibold text-navy-800 transition-colors hover:border-navy-800/35 hover:bg-bone-100"
            >
              {t("landing.howTitle")}
            </a>
          </div>
          <p className="mt-6 text-[11.5px] leading-relaxed text-ink-muted/70">
            {t("landing.privacyNote")}
          </p>
        </section>

        <section id="como-funciona" className="scroll-mt-20 pb-16 pt-4 sm:pb-24">
          <h2 className="text-center font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
            {t("landing.howTitle")}
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {(dict.landing.steps as unknown as { title: string; text: string }[]).map(
              (s, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-navy-800/10 bg-white p-6"
                >
                  <div className="h-[3px] w-10 rounded-full bg-gold-500" />
                  <h3 className="mt-5 font-display text-lg font-semibold text-navy-900">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                    {s.text}
                  </p>
                </div>
              )
            )}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/registro"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-navy-800 px-8 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-navy-700"
            >
              {t("landing.ctaStart")} →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-navy-800/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-7 text-center text-xs text-ink-muted sm:flex-row sm:px-6 sm:text-left">
          <p>
            © {new Date().getFullYear()} Sanchez Business Corp ·{" "}
            {lang === "es" ? "República Dominicana" : "Dominican Republic"}
          </p>
        </div>
      </footer>
    </div>
  );
}