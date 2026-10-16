"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
  Card,
} from "@/components/ui";
import { useDict, useI18n } from "@/lib/i18n";
import {
  DELIVERY_TIME_OPTIONS,
  SUPPLY_CAPACITY_OPTIONS,
  sbcGroupCompanies,
  type ComplianceRow,
  type ContactRow,
  type DocumentRow,
  type ReferenceRow,
  type SupplierData,
} from "@/lib/types";
import { validateFile, WARRANTY_REF } from "@/lib/upload-policy";
import { countryOptions, type CountryLanguage } from "@/lib/countries";
import type { Subdivision } from "@/lib/subdivisions";
import { cn, formatBytes } from "@/lib/utils";

export type Setter = (fn: (d: SupplierData) => SupplierData) => void;

export interface SectionProps {
  data: SupplierData;
  set: Setter;
  errors: Record<string, string>;
}

export interface WarrantyAttachmentProps {
  attached: DocumentRow[];
  uploading: boolean;
  onedriveOn: boolean;
  onPick: (file: File, onProgress: (pct: number) => void) => Promise<void>;
  onRemove: (doc: DocumentRow) => Promise<boolean>;
}

const WARRANTY_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.odt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.txt,.rtf,.zip";

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2 sm:gap-5", className)}>{children}</div>;
}

function ChoiceGrid({
  options,
  selected,
  multiple = false,
  onToggle,
}: {
  options: string[];
  selected: string[];
  multiple?: boolean;
  onToggle: (v: string) => void;
}) {
  const toggle = (v: string) => {
    if (multiple) onToggle(v);
    else onToggle(selected[0] === v ? "" : v);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            role="checkbox"
            aria-checked={active}
            onClick={() => toggle(opt)}
            className={cn(
              "rounded-full border px-4 py-2 text-[13px] font-medium transition-colors",
              active
                ? "border-navy-800 bg-navy-800 text-white"
                : "border-navy-800/20 bg-white hover:border-navy-800/60 hover:text-navy-800"
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function CountryCombobox({
  value,
  language,
  placeholder,
  emptyLabel,
  onChange,
}: {
  value: string;
  language: CountryLanguage;
  placeholder: string;
  emptyLabel: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = countryOptions[language].find((country) => country.code === value);
  const normalize = (text: string) =>
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(language);
  const normalizedQuery = normalize(query.trim());
  const results = countryOptions[language]
    .filter((country) =>
      normalize(`${country.name} ${country.code}`).includes(normalizedQuery)
    )
    .slice(0, 30);

  const select = (code: string) => {
    onChange(code);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        id="supplier-country"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="supplier-country-options"
        autoComplete="off"
        value={open ? query : selected ? `${selected.flag}  ${selected.name}` : ""}
        placeholder={placeholder}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown" && results[0]) {
            event.preventDefault();
            document.getElementById(`country-option-${results[0].code}`)?.focus();
          }
          if (event.key === "Enter" && open && results[0]) {
            event.preventDefault();
            select(results[0].code);
          }
        }}
      />
      {open && (
        <div
          id="supplier-country-options"
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.length > 0 ? (
            results.map((country) => (
              <button
                key={country.code}
                id={`country-option-${country.code}`}
                type="button"
                role="option"
                aria-selected={country.code === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(country.code)}
                className="flex w-full items-center gap-3 px-3.5 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              >
                <span className="text-lg leading-none" aria-hidden>{country.flag}</span>
                <span>{country.name}</span>
                <span className="ml-auto font-mono text-[10px] text-slate-400">{country.code}</span>
              </button>
            ))
          ) : (
            <p className="px-3.5 py-3 text-sm text-slate-500">{emptyLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1 — Información general
// ---------------------------------------------------------------------------
export function Section1({ data, set, errors }: SectionProps) {
  const { t, lang } = useI18n();
  const put = (k: keyof SupplierData["section1"], v: string) =>
    set((d) => ({ ...d, section1: { ...d.section1, [k]: v } }));
  const country = data.section1.nationality ?? "";
  const [subdivState, setSubdivState] = useState<{ country: string; list: Subdivision[] }>({
    country: "",
    list: [],
  });
  useEffect(() => {
    if (!country || subdivState.country === country) return;
    let cancelled = false;
    // Lazy import keeps the large state/province dataset out of the initial bundle.
    import("@/lib/subdivisions")
      .then((mod) => {
        if (!cancelled) setSubdivState({ country, list: mod.subdivisionsFor(country) });
      })
      .catch(() => {
        if (!cancelled) setSubdivState({ country, list: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [country, subdivState.country]);
  const countrySubdivisions = subdivState.country === country ? subdivState.list : [];
  const subdivisionsLoading = !!country && subdivState.country !== country;
  const setCountry = (code: string) =>
    set((d) => ({
      ...d,
      section1: { ...d.section1, nationality: code, provinceCountry: "" },
    }));

  return (
    <div className="space-y-5">
      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-ink">
          {t("s1.providerType")} <span className="text-danger">*</span>
        </span>
        <ChoiceGrid
          multiple={false}
          selected={data.section1.providerType ? [data.section1.providerType] : []}
          options={["juridica", "fisica"]}
          onToggle={(v) => put("providerType", v)}
        />
        {errors["s1.providerType"] && (
          <span className="mt-1 block text-xs text-danger">{errors["s1.providerType"]}</span>
        )}
      </div>
      <div>
        <span className="mb-1.5 block text-[13px] font-medium text-ink">
          {t("s1.isContractor")}
        </span>
        <YesNoOptions
          options={[
            { label: t("common.yes"), value: "si", on: data.section1.isContractor === "si" },
            { label: t("common.no"), value: "no", on: data.section1.isContractor === "no" },
          ]}
          onChange={(v) =>
            set((d) => ({
              ...d,
              section1: { ...d.section1, isContractor: v as "" | "no" | "si" },
            }))
          }
        />
        <span className="mt-1 block text-[12px] text-ink-muted">{t("s1.contractorHint")}</span>
      </div>
      <Field label={t("s1.legalName")} required error={errors["s1.legalName"]}>
        <Input value={data.section1.legalName} onChange={(e) => put("legalName", e.target.value)} />
      </Field>
      <Row>
        <Field label={t("s1.commercialName")}>
          <Input value={data.section1.commercialName} onChange={(e) => put("commercialName", e.target.value)} />
        </Field>
        <Field label={t("s1.taxId")} required error={errors["s1.taxId"]}>
          <Input value={data.section1.taxId} onChange={(e) => put("taxId", e.target.value)} />
        </Field>
      </Row>
      <Field
        label={t("s1.registryNo")}
        required={data.section1.providerType === "juridica"}
        error={errors["s1.registryNo"]}
      >
        <Input value={data.section1.registryNo} onChange={(e) => put("registryNo", e.target.value)} />
      </Field>
      <Row className="sm:grid-cols-2 sm:items-end">
        <Field label={t("s1.registryExpiry")}>
          <Input type="date" value={data.section1.registryExpiry} onChange={(e) => put("registryExpiry", e.target.value)} />
        </Field>
        <Field label={t("s1.exporterCodeExpiry")}>
          <Input type="date" value={data.section1.exporterCodeExpiry} onChange={(e) => put("exporterCodeExpiry", e.target.value)} />
        </Field>
      </Row>
      <div>
        <label htmlFor="supplier-country" className="mb-1.5 block text-[13px] font-medium text-slate-700">
          {t("s1.nationality")} <span className="text-rose-500">*</span>
        </label>
        <CountryCombobox
          value={country}
          language={lang}
          placeholder={t("s1.searchCountry")}
          emptyLabel={t("s1.noCountriesFound")}
          onChange={setCountry}
        />
        {errors["s1.nationality"] && (
          <span className="mt-1 block text-xs text-danger">{errors["s1.nationality"]}</span>
        )}
      </div>
      <Row>
        <Field label={t("s1.foundedDate")}>
          <Input type="date" value={data.section1.foundedDate} onChange={(e) => put("foundedDate", e.target.value)} />
        </Field>
        <Field label={t("s1.provinceCountry")} hint={!country ? t("s1.selectCountryFirst") : undefined}>
          {countrySubdivisions.length > 0 || subdivisionsLoading ? (
            <Select
              value={data.section1.provinceCountry}
              onChange={(e) => put("provinceCountry", e.target.value)}
              disabled={!country || subdivisionsLoading}
            >
              <option value="">—</option>
              {data.section1.provinceCountry &&
                !countrySubdivisions.some((s) => s.name === data.section1.provinceCountry) && (
                  <option value={data.section1.provinceCountry}>
                    {data.section1.provinceCountry}
                  </option>
                )}
              {countrySubdivisions.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={data.section1.provinceCountry}
              onChange={(e) => put("provinceCountry", e.target.value)}
              disabled={!country}
            />
          )}
        </Field>
      </Row>
      <Field label={t("s1.legalAddress")}>
        <Input value={data.section1.legalAddress} onChange={(e) => put("legalAddress", e.target.value)} />
      </Field>
      <Row>
        <Field label={t("s1.phoneEmail")}>
          <Input value={data.section1.phoneEmail} onChange={(e) => put("phoneEmail", e.target.value)} />
        </Field>
        <Field label={t("s1.website")}>
          <Input value={data.section1.website} onChange={(e) => put("website", e.target.value)} />
        </Field>
      </Row>
      <Field label={t("s1.mainEconomicActivity")}>
        <Input value={data.section1.mainEconomicActivity} onChange={(e) => put("mainEconomicActivity", e.target.value)} />
      </Field>
      <Field label={t("s1.goodsServices")}>
        <Textarea rows={3} value={data.section1.goodsServices} onChange={(e) => put("goodsServices", e.target.value)} />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — Contactos autorizados
// ---------------------------------------------------------------------------
const CONTACT_ROLES = ["representante", "comercial", "facturacion", "servicio"] as const;

export function Section2({ data, set }: SectionProps) {
  const { t } = useI18n();
  const s2 = useDict().s2;
  const roleLabels = s2.roles;

  const update = (idx: number, k: keyof ContactRow, v: string) =>
    set((d) => {
      const contacts = d.section2.contacts.map((c, i) => (i === idx ? { ...c, [k]: v } : c));
      return { ...d, section2: { contacts } };
    });

  const add = () =>
    set((d) =>
      d.section2.contacts.length < 6
        ? {
            ...d,
            section2: {
              contacts: [...d.section2.contacts, { role: "comercial", name: "", position: "", phone: "", email: "" }],
            },
          }
        : d
    );

  const remove = (idx: number) =>
    set((d) => ({
      ...d,
      section2: { contacts: d.section2.contacts.filter((_, i) => i !== idx) },
    }));

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-navy-800/15 bg-bone-50 px-4 py-3 text-[12.5px] leading-relaxed text-ink-soft">
        {s2.note}
      </p>
      {data.section2.contacts.map((c, i) => (
        <Card key={i} className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-ink-soft">
              {t("common.actions")} {i + 1}
            </span>
            {data.section2.contacts.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                {t("common.remove")}
              </Button>
            )}
          </div>
          <div className="space-y-4">
            <Select value={c.role} onChange={(e) => update(i, "role", e.target.value)}>
              {CONTACT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabels[r]}
                </option>
              ))}
            </Select>
            <Row>
              <Field label={t("s2.name")}>
                <Input value={c.name} onChange={(e) => update(i, "name", e.target.value)} />
              </Field>
              <Field label={t("s2.position")}>
                <Input value={c.position} onChange={(e) => update(i, "position", e.target.value)} />
              </Field>
            </Row>
            <Row>
              <Field label={t("s2.phone")}>
                <Input value={c.phone} onChange={(e) => update(i, "phone", e.target.value)} />
              </Field>
              <Field label={t("s2.email")}>
                <Input type="email" value={c.email} onChange={(e) => update(i, "email", e.target.value)} />
              </Field>
            </Row>
          </div>
        </Card>
      ))}
      {data.section2.contacts.length < 6 && (
        <Button type="button" variant="secondary" onClick={add}>
          + {t("common.add")}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — Legal, societaria y beneficiario final
// ---------------------------------------------------------------------------
export function Section3({ data, set }: SectionProps) {
  const { t } = useI18n();
  const s3 = useDict().s3;
  const put = (k: string, v: string) =>
    set((d) => ({ ...d, section3: { ...d.section3, [k]: v } }));
  const onPeP = (v: string) => {
    set((d) => ({ ...d, section3: { ...d.section3, pep: v as "no" | "si" } }));
  };
  const onRelated = (v: string) => {
    set((d) => ({ ...d, section3: { ...d.section3, relatedToSbc: v as "no" | "si" } }));
  };

  const yesNo = (active: string) => [
    { label: t("common.yes"), value: "si", on: active === "si" },
    { label: t("common.no"), value: "no", on: active === "no" },
  ];

  return (
    <div className="space-y-5">
      <Row>
        <Field label={s3.legalRepName}>
          <Input value={data.section3.legalRepName} onChange={(e) => put("legalRepName", e.target.value)} />
        </Field>
        <Field label={s3.legalRepId}>
          <Input value={data.section3.legalRepId} onChange={(e) => put("legalRepId", e.target.value)} />
        </Field>
      </Row>
      <Field label={s3.shareholders}>
        <Textarea rows={3} value={data.section3.shareholders} onChange={(e) => put("shareholders", e.target.value)} />
      </Field>
      <div className="rounded-2xl border border-navy-800/10 bg-bone-50 p-4 sm:p-5">
        <p className="mb-3 text-sm font-medium text-ink">{s3.pep}</p>
        <YesNoOptions options={yesNo(data.section3.pep)} onChange={onPeP} />
        {data.section3.pep === "si" && (
          <Field label={s3.pepDetail} className="mt-4">
            <Textarea rows={2} value={data.section3.pepDetail} onChange={(e) => put("pepDetail", e.target.value)} />
          </Field>
        )}
      </div>
      <div className="rounded-2xl border border-navy-800/10 bg-bone-50 p-4 sm:p-5">
        <p className="mb-3 text-sm font-medium text-ink">{s3.relatedToSbc}</p>
        <YesNoOptions options={yesNo(data.section3.relatedToSbc)} onChange={onRelated} />
        {data.section3.relatedToSbc === "si" && (
          <Field label={s3.relatedToSbcDetail} className="mt-4">
            <Textarea rows={2} value={data.section3.relatedToSbcDetail} onChange={(e) => put("relatedToSbcDetail", e.target.value)} />
          </Field>
        )}
      </div>
      <Field label={s3.relatedCompanies}>
        <Textarea rows={3} value={data.section3.relatedCompanies} onChange={(e) => put("relatedCompanies", e.target.value)} />
      </Field>
    </div>
  );
}

export function YesNoOptions({
  options,
  onChange,
}: {
  options: { label: string; value: string; on: boolean }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.on ? "" : o.value)}
          className={cn(
            "rounded-full border px-5 py-2 text-[13px] font-medium transition-colors",
            o.on
              ? "border-navy-800 bg-navy-800 text-white"
              : "border-navy-800/20 bg-white hover:border-navy-800/60"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 4 — Fiscal y laboral
// ---------------------------------------------------------------------------
export function Section4({ data, set }: SectionProps) {
  const d = useDict();
  const s4 = d.s4;

  const toggleIn = (key: "taxReceipts" | "tss" | "specialRegime", v: string) => {
    set((fn) => {
      const cur = fn.section4[key];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      return { ...fn, section4: { ...fn.section4, [key]: next } };
    });
  };

  const put = (k: string, v: string) =>
    set((fn) => ({ ...fn, section4: { [k]: v, ...fn.section4 } }));

  return (
    <div className="space-y-5">
      <div>
        <span className="mb-2 block text-[13px] font-medium text-ink">{s4.taxReceipts}</span>
        <ChoiceGrid
          multiple
          options={["ncf", "ecf", "na"]}
          selected={data.section4.taxReceipts}
          onToggle={(v) => toggleIn("taxReceipts", v)}
        />
        <p className="mt-1 text-xs text-ink-muted">
          {["ncf", "ecf", "na"].map((k) => (k === "ncf" ? s4.t1 : k === "ecf" ? s4.t2 : s4.t3)).join(" · ")}
        </p>
      </div>
      <Field label={s4.taxCondition}>
        <Select value={data.section4.taxCondition} onChange={(e) => put("taxCondition", e.target.value)}>
          <option value="">—</option>
          {Object.entries(s4.taxConditions).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <span className="mb-2 block text-[13px] font-medium text-ink">{s4.tss}</span>
        <ChoiceGrid
          multiple
          options={["aldia", "noEmpleados", "na", "pendiente"]}
          selected={data.section4.tss}
          onToggle={(v) => toggleIn("tss", v)}
        />
      </div>
      <Field label={s4.withholdings}>
        <Input value={data.section4.withholdings} onChange={(e) => put("withholdings", e.target.value)} />
      </Field>
      <div>
        <span className="mb-2 block text-[13px] font-medium text-ink">{s4.specialRegime}</span>
        <ChoiceGrid
          multiple
          options={["mipyme", "mipymeMujer", "zonaFranca", "exento", "otro"]}
          selected={data.section4.specialRegime}
          onToggle={(v) => toggleIn("specialRegime", v)}
        />
      </div>
      {data.section4.specialRegime.includes("otro") && (
        <Field label={s4.specialRegimeOther}>
          <Input value={data.section4.specialRegimeOther} onChange={(e) => put("specialRegimeOther", e.target.value)} />
        </Field>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 5 — Bancaria
// ---------------------------------------------------------------------------
export function Section5({ data, set }: SectionProps) {
  const { t } = useI18n();
  const s5 = useDict().s5;
  const put = (k: string, v: string) =>
    set((fn) => ({ ...fn, section5: { ...fn.section5, [k]: v } }));

  const toggleIn = (key: "accountType" | "paymentTerms" | "creditCompanies", v: string) => {
    set((fn) => {
      const cur = fn.section5[key];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      return { ...fn, section5: { ...fn.section5, [key]: next } };
    });
  };

  return (
    <div className="space-y-5">
      <Row>
        <Field label={s5.bank}>
          <Input value={data.section5.bank} onChange={(e) => put("bank", e.target.value)} />
        </Field>
        <Field label={s5.accountHolder}>
          <Input value={data.section5.accountHolder} onChange={(e) => put("accountHolder", e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={s5.accountHolderId}>
          <Input value={data.section5.accountHolderId} onChange={(e) => put("accountHolderId", e.target.value)} />
        </Field>
        <div>
          <span className="mb-2 block text-[13px] font-medium text-ink">{s5.accountType}</span>
          <ChoiceGrid
            multiple
            options={["corriente", "ahorros"]}
            selected={data.section5.accountType}
            onToggle={(v) => toggleIn("accountType", v)}
          />
        </div>
      </Row>
      <Row>
        <Field label={s5.currency}>
          <Select value={data.section5.currency} onChange={(e) => put("currency", e.target.value)}>
            <option value="">—</option>
            <option value="DOP">{s5.currencies.DOP}</option>
            <option value="USD">{s5.currencies.USD}</option>
            <option value="EUR">{s5.currencies.EUR}</option>
            <option value="otra">{s5.currencies.otra}</option>
          </Select>
        </Field>
        {data.section5.currency === "otra" && (
          <Field label={s5.currencyOther}>
            <Input value={data.section5.currencyOther} onChange={(e) => put("currencyOther", e.target.value)} />
          </Field>
        )}
      </Row>
      <Row>
        <Field label={s5.accountNumber}>
          <Input value={data.section5.accountNumber} onChange={(e) => put("accountNumber", e.target.value)} />
        </Field>
        <Field label={s5.swift}>
          <Input value={data.section5.swift} onChange={(e) => put("swift", e.target.value)} />
        </Field>
      </Row>
      <div>
        <span className="mb-2 block text-[13px] font-medium text-ink">{s5.paymentTerms}</span>
        <ChoiceGrid
          multiple
          options={["contado", "credito", "anticipo", "contraEntrega"]}
          selected={data.section5.paymentTerms}
          onToggle={(v) => toggleIn("paymentTerms", v)}
        />
      </div>
      <Row>
        {data.section5.paymentTerms.includes("credito") && (
          <Field label={s5.creditDays}>
            <Input type="number" min={0} value={data.section5.creditDays} onChange={(e) => put("creditDays", e.target.value)} />
          </Field>
        )}
        {data.section5.paymentTerms.includes("anticipo") && (
          <Field label={s5.advancePct}>
            <Input type="number" min={0} max={100} value={data.section5.advancePct} onChange={(e) => put("advancePct", e.target.value)} />
          </Field>
        )}
      </Row>
      <div className="rounded-2xl border border-navy-800/10 bg-bone-50 p-4 sm:p-5">
        <p className="mb-3 text-sm font-medium text-ink">{s5.offersCredit}</p>
        <YesNoOptions
          options={[
            { label: t("common.yes"), value: "si", on: data.section5.offersCredit === "si" },
            { label: t("common.no"), value: "no", on: data.section5.offersCredit === "no" },
          ]}
          onChange={(v) =>
            set((fn) => ({
              ...fn,
              section5: {
                ...fn.section5,
                offersCredit: v as "" | "no" | "si",
                creditCompanies: v === "si" ? fn.section5.creditCompanies : [],
              },
            }))
          }
        />
        {data.section5.offersCredit === "si" && (
          <div className="mt-4">
            <span className="mb-2 block text-[13px] font-medium text-ink">{s5.creditCompanies}</span>
            <ChoiceGrid
              multiple
              options={sbcGroupCompanies}
              selected={data.section5.creditCompanies}
              onToggle={(v) => toggleIn("creditCompanies", v)}
            />
          </div>
        )}
      </div>
      <p className="rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 text-[12.5px] leading-relaxed text-warning">
        {s5.fraudNote}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 6 — Experiencia y capacidad
// ---------------------------------------------------------------------------
export function Section6({
  data,
  set,
  warranty,
}: SectionProps & { warranty?: WarrantyAttachmentProps }) {
  const s6 = useDict().s6;
  const { t } = useI18n();
  const warrantyFileRef = useRef<HTMLInputElement | null>(null);
  const [warrantyPct, setWarrantyPct] = useState<number | null>(null);
  const put = (k: string, v: string) =>
    set((fn) => ({ ...fn, section6: { ...fn.section6, [k]: v } }));
  const toggleCoverage = (v: string) => {
    set((fn) => {
      const cur = fn.section6.coverage;
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      return { ...fn, section6: { ...fn.section6, coverage: next } };
    });
  };

  const capacity = data.section6.supplyCapacity;
  const delivery = data.section6.avgDeliveryTime;
  const warrantyDocs = (warranty?.attached ?? []).filter((d) => d.ref === WARRANTY_REF);

  const pickWarranty = async (file: File) => {
    if (!warranty) return;
    if (warranty.uploading || warrantyPct !== null) {
      window.alert(t("docs.uploadLocked"));
      return;
    }
    const invalid = validateFile(file);
    if (invalid === "too_large") {
      window.alert(t("validation.fileTooLarge"));
      return;
    }
    if (invalid === "unsupported_type") {
      window.alert(t("validation.unsupportedType"));
      return;
    }
    setWarrantyPct(0);
    try {
      await warranty.onPick(file, (pct) => setWarrantyPct(pct));
    } catch {
      window.alert(t("docs.error"));
    } finally {
      setWarrantyPct(null);
    }
  };

  return (
    <div className="space-y-5">
      <Row>
        <Field label={s6.yearsExperience}>
          <Input type="number" min={0} value={data.section6.yearsExperience} onChange={(e) => put("yearsExperience", e.target.value)} />
        </Field>
        <div>
          <span className="mb-2 block text-[13px] font-medium text-ink">{s6.coverage}</span>
          <ChoiceGrid
            multiple
            options={["local", "nacional", "internacional"]}
            selected={data.section6.coverage}
            onToggle={toggleCoverage}
          />
        </div>
      </Row>
      {data.section6.coverage.includes("internacional") && (
        <Field label={s6.coverageDetail}>
          <Input value={data.section6.coverageDetail} onChange={(e) => put("coverageDetail", e.target.value)} />
        </Field>
      )}
      <Row>
        <Field label={s6.supplyCapacity}>
          <Select value={capacity} onChange={(e) => put("supplyCapacity", e.target.value)}>
            <option value="">—</option>
            {capacity && !(SUPPLY_CAPACITY_OPTIONS as readonly string[]).includes(capacity) && (
              <option value={capacity}>{capacity}</option>
            )}
            {SUPPLY_CAPACITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {s6.supplyCapacityOptions[opt]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={s6.avgDeliveryTime}>
          <Select value={delivery} onChange={(e) => put("avgDeliveryTime", e.target.value)}>
            <option value="">—</option>
            {delivery && !(DELIVERY_TIME_OPTIONS as readonly string[]).includes(delivery) && (
              <option value={delivery}>{delivery}</option>
            )}
            {DELIVERY_TIME_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {s6.avgDeliveryTimeOptions[opt]}
              </option>
            ))}
          </Select>
        </Field>
      </Row>
      <Field label={s6.warrantyPolicy}>
        <Textarea rows={3} value={data.section6.warrantyPolicy} onChange={(e) => put("warrantyPolicy", e.target.value)} />
      </Field>
      {warranty && (
        <div>
          <span className="mb-2 block text-[13px] font-medium text-ink">{s6.warrantyDocLabel}</span>
          <div className="space-y-2.5 rounded-xl border border-navy-800/10 bg-bone-50/40 p-3.5">
            {warrantyDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-navy-800/10 bg-white px-3 py-2 text-[13px]"
              >
                <span className="min-w-0 flex-1">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-navy-700 underline decoration-navy-700/30 underline-offset-2 hover:decoration-navy-700"
                  >
                    {doc.file_name}
                  </a>
                  <span className="text-xs text-ink-muted">{formatBytes(doc.file_size)}</span>
                </span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[11px] font-medium text-success">✓ {t("docs.uploaded")}</span>
                  <button
                    type="button"
                    onClick={() => void warranty.onRemove(doc)}
                    className="text-xs text-ink-muted underline hover:text-danger"
                  >
                    {t("docs.remove")}
                  </button>
                </div>
              </div>
            ))}

            {warrantyPct !== null && (
              <div className="rounded-lg border border-navy-800/15 bg-navy-50/60 px-3 py-3">
                <div className="flex items-center justify-between gap-2 text-[11.5px] font-medium text-navy-700">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-navy-800/25 border-t-navy-800" />
                    {t("docs.processing")}
                  </span>
                  <span className="tabular-nums">{t("docs.progressLabel", { pct: String(warrantyPct) })}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-navy-800/10">
                  <div
                    className="h-full rounded-full bg-navy-800 transition-all duration-300"
                    style={{ width: `${warrantyPct}%` }}
                  />
                </div>
              </div>
            )}

            {warrantyDocs.length > 0 && warrantyPct === null && (
              <p className="text-[11.5px] text-ink-muted">{s6.warrantyDocReplace}</p>
            )}

            <input
              ref={warrantyFileRef}
              type="file"
              className="sr-only"
              accept={WARRANTY_ACCEPT}
              disabled={warrantyPct !== null || warranty.uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void pickWarranty(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={warrantyPct !== null || warranty.uploading || !warranty.onedriveOn}
              onClick={() => warrantyFileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-800/20 bg-white px-4 py-4 text-sm transition-colors hover:border-navy-800/50 hover:bg-bone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("docs.dropHint")}
            </button>

            {!warranty.onedriveOn && (
              <p className="text-[11.5px] leading-snug text-warning">{t("docs.notConfigured")}</p>
            )}
            <p className="text-[11.5px] leading-snug text-ink-muted">{s6.warrantyDocHint}</p>
          </div>
        </div>
      )}
      <Field label={s6.brands}>
        <Input value={data.section6.brands} onChange={(e) => put("brands", e.target.value)} />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 7 — Referencias
// ---------------------------------------------------------------------------
export function Section7({ data, set }: SectionProps) {
  const { t } = useI18n();
  const s7 = useDict().s7;

  const update = (idx: number, k: keyof ReferenceRow, v: string) =>
    set((d) => ({
      ...d,
      section7: {
        references: d.section7.references.map((r, i) => (i === idx ? { ...r, [k]: v } : r)),
      },
    }));

  const add = () =>
    set((d) =>
      d.section7.references.length < 5
        ? {
            ...d,
            section7: {
              references: [...d.section7.references, { client: "", contact: "", phoneEmail: "", product: "" }],
            },
          }
        : d
    );

  const remove = (idx: number) =>
    set((d) => ({ ...d, section7: { references: d.section7.references.filter((_, i) => i !== idx) } }));

  return (
    <div className="space-y-4">
      {data.section7.references.map((r, i) => (
        <Card key={i} className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-ink-soft">#{i + 1}</span>
            {data.section7.references.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                {t("common.remove")}
              </Button>
            )}
          </div>
          <div className="space-y-4">
            <Row>
              <Field label={s7.client}>
                <Input value={r.client} onChange={(e) => update(i, "client", e.target.value)} />
              </Field>
              <Field label={s7.contact}>
                <Input value={r.contact} onChange={(e) => update(i, "contact", e.target.value)} />
              </Field>
            </Row>
            <Row>
              <Field label={s7.phoneEmail}>
                <Input value={r.phoneEmail} onChange={(e) => update(i, "phoneEmail", e.target.value)} />
              </Field>
              <Field label={s7.product}>
                <Input value={r.product} onChange={(e) => update(i, "product", e.target.value)} />
              </Field>
            </Row>
          </div>
        </Card>
      ))}
      {data.section7.references.length < 5 && (
        <Button type="button" variant="secondary" onClick={add}>
          + {t("common.add")}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 8 — Cumplimiento, integridad y conflictos
// ---------------------------------------------------------------------------
export function Section8({ data, set }: SectionProps) {
  const { t } = useI18n();
  const s8 = useDict().s8;

  const update = (idx: number, k: keyof ComplianceRow, v: string) =>
    set((d) => ({
      ...d,
      section8: {
        compliance: d.section8.compliance.map((c, i) => (i === idx ? { ...c, [k]: v } : c)),
      },
    }));

  return (
    <div className="space-y-5">
      {s8.questions.map((q, idx) => {
        const row = data.section8.compliance[idx];
        return (
          <Card key={idx} className="p-4 sm:p-5">
            <div className="mb-3 flex items-start gap-2">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy-800 text-xs font-semibold text-white">
                {idx + 1}
              </span>
              <p className="text-sm font-medium leading-snug text-ink">{q}</p>
            </div>
            <div className="mb-3 flex gap-2">
              {[
                { label: t("common.no"), value: "no" },
                { label: t("common.si"), value: "si" },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => update(idx, "answer", row.answer === o.value ? "" : o.value)}
                  className={cn(
                    "rounded-full border px-5 py-2 text-[13px] font-medium transition-colors",
                    row.answer === o.value
                      ? "border-navy-800 bg-navy-800 text-white"
                      : "border-navy-800/20 bg-white hover:border-navy-800/60"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {row.answer === "si" && (
              <Field label={s8.explanation}>
                <Textarea rows={2} value={row.explanation} onChange={(e) => update(idx, "explanation", e.target.value)} />
              </Field>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 10 — Autorizaciones
// ---------------------------------------------------------------------------
export function Section10({ data, set }: SectionProps) {
  const s10 = useDict().s10;

  const toggle = (idx: number) =>
    set((d) => {
      const cur = d.section10.authorizations;
      const id = String(idx);
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...d, section10: { authorizations: next } };
    });

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">{s10.intro}</p>
      {s10.authorizations.map((a, idx) => {
        const active = data.section10.authorizations.includes(String(idx));
        return (
          <Checkbox
            key={idx}
            checked={active}
            onChange={() => toggle(idx)}
            label={<span className="leading-relaxed">{a}</span>}
          />
        );
      })}
      <p className="mx-auto w-fit rounded-xl bg-bone-200 px-4 py-2 text-[12.5px] text-ink-soft">
        {s10.requiredNote}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 11 — Declaración y firma
// ---------------------------------------------------------------------------
export function Section11({
  data,
  set,
  errors,
  signaturePad,
}: SectionProps & { signaturePad: ReactNode }) {
  const s11 = useDict().s11;
  const put = (k: string, v: string) => set((d) => ({ ...d, section11: { ...d.section11, [k]: v } }));

  return (
    <div className="space-y-5">
      <p className="rounded-2xl border border-navy-800/10 bg-bone-50 p-5 text-[13.5px] leading-relaxed text-ink-soft">
        {s11.declaration}
      </p>
      <Row>
        <Field label={s11.signerName} required error={errors["s11.signerName"]}>
          <Input value={data.section11.signerName} onChange={(e) => put("signerName", e.target.value)} />
        </Field>
        <Field label={s11.signerRole}>
          <Input value={data.section11.signerRole} onChange={(e) => put("signerRole", e.target.value)} />
        </Field>
      </Row>
      <Row>
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink">
            {s11.signature} <span className="text-danger">*</span>
          </span>
          {signaturePad}
        </div>
        <Field label={s11.signDate}>
          <Input
            type="date"
            value={data.section11.signedDate}
            onChange={(e) => put("signedDate", e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </Field>
      </Row>
      <Checkbox
        checked={data.section11.signatureConsent}
        onChange={(v) =>
          set((d) => ({ ...d, section11: { ...d.section11, signatureConsent: v } }))
        }
        label={s11.consent}
      />
      {errors["s11.signature"] && <p className="text-xs text-danger">{errors["s11.signature"]}</p>}
    </div>
  );
}