"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { Input, Select, Button } from "@/components/ui";
import { ALL_STATUSES, ALL_RISKS, PROVIDER_TYPES, COUNTRIES } from "./tones";

export function SuppliersFilters() {
  const { t } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [status, setStatus] = useState(sp.get("status") ?? "");
  const [risk, setRisk] = useState(sp.get("risk") ?? "");
  const [type, setType] = useState(sp.get("type") ?? "");
  const [country, setCountry] = useState(sp.get("country") ?? "");
  const [tag, setTag] = useState(sp.get("tag") ?? "");

  const hasActive = Boolean(
    sp.get("q") || sp.get("status") || sp.get("risk") || sp.get("type") || sp.get("country") || sp.get("tag")
  );

  const apply = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (risk) params.set("risk", risk);
      if (type) params.set("type", type);
      if (country) params.set("country", country);
      if (tag.trim()) params.set("tag", tag.trim());
      router.push(`/admin/suppliers${params.size ? `?${params.toString()}` : ""}`);
    },
    [q, status, risk, type, country, tag, router]
  );

  return (
    <form
      onSubmit={(e) => apply(e)}
      className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs"
    >
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("admin.suppliers.searchPlaceholder")}
            className="pl-10"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="lg:w-44">
          <option value="">{t("admin.suppliers.status")}</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}` as never)}
            </option>
          ))}
        </Select>
        <Select value={risk} onChange={(e) => setRisk(e.target.value)} className="lg:w-36">
          <option value="">{t("admin.suppliers.risk")}</option>
          {ALL_RISKS.map((r) => (
            <option key={r} value={r}>
              {t(`risk.${r}` as never)}
            </option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="lg:w-44">
          <option value="">{t("admin.suppliers.providerType")}</option>
          {PROVIDER_TYPES.map((p) => (
            <option key={p} value={p}>
              {p.replace(/_/g, " ").toLowerCase()}
            </option>
          ))}
        </Select>
        <Select value={country} onChange={(e) => setCountry(e.target.value)} className="lg:w-44">
          <option value="">{t("admin.suppliers.country")}</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2.5">
          <Input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder={t("admin.suppliers.tag")}
            className="h-9 max-w-[240px] text-xs"
          />
          <Button type="submit" size="sm">
            Filtrar
          </Button>
        </div>
        {hasActive && (
          <button
            type="button"
            onClick={() => router.push("/admin/suppliers")}
            className="text-xs font-semibold text-slate-500 hover:text-navy-900 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </form>
  );
}