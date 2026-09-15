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
      className="rounded-2xl border border-navy-800/10 bg-white p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("admin.suppliers.searchPlaceholder")}
          className="flex-1"
        />
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
      <div className="mt-3 flex items-center gap-3">
        <Input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder={t("admin.suppliers.tag")}
          className="h-10 max-w-[260px] text-[13px]"
        />
        <Button type="submit" size="sm">
          Filtrar
        </Button>
        {hasActive && (
          <button
            type="button"
            onClick={() => router.push("/admin/suppliers")}
            className="text-[13px] text-ink-muted underline underline-offset-2 hover:text-navy-700"
          >
            Limpiar
          </button>
        )}
      </div>
    </form>
  );
}