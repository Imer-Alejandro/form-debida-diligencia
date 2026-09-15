"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { LangToggle } from "@/components/LangToggle";
import { useI18n } from "@/lib/i18n";

export function WizardShell({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-bone-100 via-bone-50 to-cream-50">
      <header className="sticky top-0 z-30 border-b border-navy-800/10 bg-bone-50/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Inicio">
            <Logo dark />
          </Link>
          <LangToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="border-t border-navy-800/10 bg-bone-100/60">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 px-4 py-6 text-center text-xs text-ink-muted sm:flex-row sm:px-6 sm:text-left">
          <p>© {new Date().getFullYear()} Sanchez Business Corp — {lang === "es" ? "República Dominicana" : "Dominican Republic"}</p>
          <p>Privado y confidencial</p>
        </div>
      </footer>
    </div>
  );
}