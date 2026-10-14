"use client";

import Link from "next/link";
import { Logo } from "@/components/ui";
import { useI18n, useDict } from "@/lib/i18n";

export function PortalFooter() {
  const { t } = useI18n();
  const dict = useDict();
  const f = dict.portal.footer;

  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand & description */}
          <div className="lg:col-span-2">
            <Logo dark />
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-slate-500">
              {f.description}
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span>{f.complianceBadge}</span>
            </div>
          </div>

          {/* Contact and address */}
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-800">
              {f.contactHeading}
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-500">
              <li>
                <span className="block font-medium text-slate-700">{f.purchasingDept}</span>
                <a
                  href="mailto:compras@sanchezbusinesscorp.com"
                  className="text-navy-900 underline hover:text-navy-700"
                >
                  compras@sanchezbusinesscorp.com
                </a>
              </li>
              <li>
                <span className="block font-medium text-slate-700">{f.automationSupport}</span>
                <a
                  href="mailto:Automatizaciones@sanchezbusinesscorp.com"
                  className="text-navy-900 underline hover:text-navy-700"
                >
                  Automatizaciones@sanchezbusinesscorp.com
                </a>
              </li>
              <li>
                <span>{f.city}</span>
              </li>
            </ul>
          </div>

          {/* Quick links & security */}
          <div>
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-800">
              {f.securityHeading}
            </h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-500">
              <li>{f.sharepointNote}</li>
              <li>{f.encryptionNote}</li>
              <li>{f.dataProtection}</li>
              <li className="pt-2">
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-1 font-semibold text-navy-800 hover:underline"
                >
                  <span>{f.adminLink}</span>
                  <span>→</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal disclaimers & copyright */}
        <div className="mt-10 border-t border-slate-100 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-[11px] text-slate-400">
          <p>
            {t("portal.footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <p className="max-w-md text-slate-400 sm:text-right">
            {f.disclaimer}
          </p>
        </div>
      </div>
    </footer>
  );
}
