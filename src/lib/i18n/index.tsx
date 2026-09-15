"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { es, type EsDict } from "./es";
import { en, type EnDict } from "./en";

export type Lang = "es" | "en";
export const dictionaries: Record<Lang, EsDict | EnDict> = { es, en };

export const DEFAULT_LANG: Lang = "es";
const COOKIE = "sb_lang";
const MAX_AGE = 60 * 60 * 24 * 365;

type DeepKey<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? `${K}` | `${K}.${DeepKey<T[K]>}`
        : never;
    }[keyof T]
  : never;

export type TKey = DeepKey<EsDict>;

function getDeep(obj: unknown, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

interface I18nValue {
  lang: Lang;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  initialLang = DEFAULT_LANG,
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `${COOKIE}=${l}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
  }, []);

  const t = useCallback<I18nValue["t"]>(
    (key, vars) => {
      let out = getDeep(dictionaries[lang], key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return out;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/** Returns the current raw dictionary (for arrays and dynamic option lists). */
export function useDict(): EsDict | EnDict {
  const { lang } = useI18n();
  return dictionaries[lang];
}