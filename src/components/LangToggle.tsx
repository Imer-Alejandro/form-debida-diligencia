"use client";

import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LangToggle({ light = false }: { light?: boolean }) {
  const { lang, setLang } = useI18n();

  return (
    <div
      className={cn(
        "flex items-center rounded-full border p-1",
        light
          ? "border-white/20 bg-white/10 text-white"
          : "border-navy-800/15 bg-white text-ink"
      )}
      role="group"
      aria-label="Idioma"
    >
      {(["es", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
            lang === l
              ? light
                ? "bg-white text-navy-900"
                : "bg-navy-800 text-white"
              : light
                ? "text-white/70 hover:text-white"
                : "text-ink-muted hover:text-ink"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}