"use client";

import Link from "next/link";
import { Logo } from "@/components/ui";

export function PortalFooter() {
  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand & description */}
          <div className="lg:col-span-2">
            <Logo dark />
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-slate-500">
              Plataforma oficial de gestión de debida diligencia, verificación de beneficiarios finales y homologación de proveedores de Sánchez Business &amp; Corp.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span>Conforme a la Ley 155-17 y normativa de compras responsable</span>
            </div>
          </div>

          {/* Contact and address */}
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-800">
              Contacto y Soporte
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-500">
              <li>
                <span className="block font-medium text-slate-700">Departamento de Compras:</span>
                <a
                  href="mailto:compras@sanchezbusinesscorp.com"
                  className="text-navy-900 underline hover:text-navy-700"
                >
                  compras@sanchezbusinesscorp.com
                </a>
              </li>
              <li>
                <span className="block font-medium text-slate-700">Soporte Automatizaciones:</span>
                <a
                  href="mailto:Automatizaciones@sanchezbusinesscorp.com"
                  className="text-navy-900 underline hover:text-navy-700"
                >
                  Automatizaciones@sanchezbusinesscorp.com
                </a>
              </li>
              <li>
                <span>Santo Domingo, República Dominicana</span>
              </li>
            </ul>
          </div>

          {/* Quick links & security */}
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-800">
              Seguridad y Cumplimiento
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-500">
              <li>Repositorio Seguro en Microsoft SharePoint</li>
              <li>Cifrado de datos en tránsito y en reposo</li>
              <li>Protección de Datos (Ley 172-13)</li>
              <li className="pt-2">
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-1 font-semibold text-navy-800 hover:underline"
                >
                  <span>Portal Administrativo Interno</span>
                  <span>→</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal disclaimers & copyright */}
        <div className="mt-10 border-t border-slate-100 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-[11px] text-slate-400">
          <p>
            © {new Date().getFullYear()} Sánchez Business &amp; Corp. Todos los derechos reservados. República Dominicana.
          </p>
          <p className="max-w-md text-slate-400 sm:text-right">
            La recepción de información no implica aprobación automática ni compromiso de contratación.
          </p>
        </div>
      </div>
    </footer>
  );
}
