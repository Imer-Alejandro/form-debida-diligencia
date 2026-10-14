"use client";

import { useI18n, useDict } from "@/lib/i18n";

interface QuickActionGridProps {
  onOpenStartModal: () => void;
  onOpenRequirementsModal: () => void;
  onScrollToLookup: () => void;
}

export function QuickActionGrid({
  onOpenStartModal,
  onOpenRequirementsModal,
  onScrollToLookup,
}: QuickActionGridProps) {
  const { lang } = useI18n();
  const dict = useDict();
  const act = dict.portal.actions;

  const actions = [
    {
      title: act.action1Title,
      subtitle: act.action1Sub,
      badge: act.action1Badge,
      icon: (
        <svg className="h-5 w-5 text-navy-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
      ),
      cta: act.action1Cta,
      onClick: onOpenStartModal,
    },
    {
      title: act.action2Title,
      subtitle: act.action2Sub,
      badge: act.action2Badge,
      icon: (
        <svg className="h-5 w-5 text-teal-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
      cta: act.action2Cta,
      onClick: onScrollToLookup,
    },
    {
      title: act.action3Title,
      subtitle: act.action3Sub,
      badge: act.action3Badge,
      icon: (
        <svg className="h-5 w-5 text-navy-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
          <line x1="12" x2="12" y1="11" y2="17" />
          <line x1="9" x2="15" y1="14" y2="14" />
        </svg>
      ),
      cta: act.action3Cta,
      onClick: onOpenRequirementsModal,
    },
    {
      title: act.action4Title,
      subtitle: act.action4Sub,
      badge: act.action4Badge,
      icon: (
        <svg className="h-5 w-5 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
      cta: act.action4Cta,
      href: `mailto:compras@sanchezbusinesscorp.com?subject=${encodeURIComponent(
        lang === "es"
          ? "Consulta Portal Proveedores - Debida Diligencia"
          : "Supplier Portal Inquiry - Due Diligence"
      )}`,
    },
  ];

  return (
    <section className="py-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((actItem, i) => (
          <div
            key={i}
            onClick={actItem.onClick}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 transition-colors group-hover:bg-navy-900 group-hover:text-white">
                  <div className="transition-colors group-hover:[&_svg]:text-white">
                    {actItem.icon}
                  </div>
                </div>
                <span className="rounded-full bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 text-[10.5px] font-semibold text-slate-500">
                  {actItem.badge}
                </span>
              </div>

              <h3 className="mt-4 font-display text-base font-bold text-slate-900 group-hover:text-navy-900">
                {actItem.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                {actItem.subtitle}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-navy-900 group-hover:text-teal-700">
              {actItem.href ? (
                <a
                  href={actItem.href}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5"
                >
                  {actItem.cta}
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  {actItem.cta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
