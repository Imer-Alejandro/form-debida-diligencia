"use client";

import Link from "next/link";
import { Logo } from "@/components/ui";
import { LangToggle } from "@/components/LangToggle";

interface PortalHeaderProps {
  onOpenStartModal?: () => void;
  onOpenRequirementsModal?: () => void;
  onScrollToLookup?: () => void;
}

export function PortalHeader({
  onOpenStartModal,
  onOpenRequirementsModal,
  onScrollToLookup,
}: PortalHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Portal de Proveedores · Sánchez Business & Corp.">
          <Logo dark />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
          {onScrollToLookup && (
            <button
              type="button"
              onClick={onScrollToLookup}
              className="hover:text-navy-900 transition-colors"
            >
              Consultar Estado
            </button>
          )}
          {onOpenRequirementsModal && (
            <button
              type="button"
              onClick={onOpenRequirementsModal}
              className="hover:text-navy-900 transition-colors"
            >
              Guía de Requisitos
            </button>
          )}
          <a
            href="#proceso"
            className="hover:text-navy-900 transition-colors"
          >
            Cómo Funciona
          </a>
          <a
            href="mailto:compras@sanchezbusinesscorp.com"
            className="hover:text-navy-900 transition-colors"
          >
            Contacto
          </a>
        </nav>

        {/* Action CTAs & Language */}
        <div className="flex items-center gap-3">
          {onOpenStartModal && (
            <button
              type="button"
              onClick={onOpenStartModal}
              className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-xl bg-navy-900 px-4 text-xs font-semibold text-white shadow-2xs hover:bg-navy-800 transition-colors"
            >
              Iniciar Formulario →
            </button>
          )}

          <LangToggle />

          <Link
            href="/admin/login"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-2xs hover:border-slate-300 hover:text-slate-800 transition-colors"
            title="Acceso Administrativo (Oficial de Cumplimiento)"
            aria-label="Acceso Administrativo"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
