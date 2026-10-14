"use client";

import { useState } from "react";
import { useI18n, useDict } from "@/lib/i18n";

export function PortalFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const { t } = useI18n();
  const dict = useDict();
  const faqs = dict.portal.faqs;

  return (
    <section className="py-12 border-t border-slate-200/80">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t("portal.faqHeading")}
          </span>
          <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            {t("portal.faqTitle")}
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left font-display text-sm font-semibold text-slate-900 hover:text-navy-900 transition-colors"
                >
                  <span>{f.q}</span>
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-xs text-slate-600 transition-transform ${
                      isOpen ? "rotate-180 bg-navy-900 text-white" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-[#f8fafc] px-5 py-4 text-xs leading-relaxed text-slate-600 animate-in fade-in duration-150">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
