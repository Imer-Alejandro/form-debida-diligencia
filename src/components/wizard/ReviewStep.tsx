"use client";

import { useDict, useI18n } from "@/lib/i18n";
import type { DocumentIntent, DocumentRow, SupplierData } from "@/lib/types";
import { countryName } from "@/lib/countries";
import { WARRANTY_REF } from "@/lib/upload-policy";
import { requiredDocumentRefs } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

function KV({ k, v }: { k: string; v?: string }) {
  if (!v || !v.trim()) return null;
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{k}</dt>
      <dd className="mt-0.5 text-[13px] leading-snug text-ink">{v}</dd>
    </div>
  );
}

function optionLabel(v: string, m?: Record<string, string>): string {
  return (m && m[v]) || v;
}

function YesNo({ v }: { v: string }) {
  if (!v) return <span className="text-ink-muted">—</span>;
  return v === "si" ? (
    <span className="font-medium text-danger">Sí</span>
  ) : (
    <span className="font-medium text-success">No</span>
  );
}

export function ReviewStep({
  data,
  attached,
  documents,
  onEdit,
}: {
  data: SupplierData;
  attached: DocumentRow[];
  documents: DocumentIntent[];
  onEdit: (step: number) => void;
}) {
  const dict = useDict();
  const { lang } = useI18n();

  const visibleDocs = documents.filter((d) => d.checked);
  const warrantyDoc = attached.find((a) => a.ref === WARRANTY_REF);
  const hasAnswer = (values: (string | string[] | boolean)[]) =>
    values.some((value) =>
      Array.isArray(value)
        ? value.length > 0
        : typeof value === "string"
          ? value.trim().length > 0
          : value
    );
  const requiredRefs = requiredDocumentRefs({
    providerType: data.section1.providerType,
    nationality: data.section1.nationality,
    isContractor: data.section1.isContractor,
  });
  const incompleteSections = [
    {
      step: 0,
      title: dict.s1.title,
      incomplete: !hasAnswer([
        data.section1.providerType,
        data.section1.legalName,
        data.section1.taxId,
        data.section1.nationality,
        data.section1.legalAddress,
        data.section1.mainEconomicActivity,
      ]),
    },
    {
      step: 1,
      title: dict.s2.title,
      incomplete: !data.section2.contacts.some((contact) =>
        hasAnswer([contact.name, contact.email, contact.phone, contact.position])
      ),
    },
    {
      step: 2,
      title: dict.s3.title,
      incomplete: !hasAnswer([
        data.section3.legalRepName,
        data.section3.legalRepId,
        data.section3.shareholders,
        data.section3.pep,
        data.section3.relatedToSbc,
        data.section3.relatedCompanies,
      ]),
    },
    {
      step: 3,
      title: dict.s4.title,
      incomplete: !hasAnswer([
        data.section4.taxReceipts,
        data.section4.taxCondition,
        data.section4.tss,
        data.section4.withholdings,
        data.section4.specialRegime,
      ]),
    },
    {
      step: 4,
      title: dict.s5.title,
      incomplete: !hasAnswer([
        data.section5.bank,
        data.section5.accountHolder,
        data.section5.accountType,
        data.section5.currency,
        data.section5.accountNumber,
        data.section5.paymentTerms,
      ]),
    },
    {
      step: 5,
      title: dict.s6.title,
      incomplete: !hasAnswer([
        data.section6.yearsExperience,
        data.section6.coverage,
        data.section6.supplyCapacity,
        data.section6.avgDeliveryTime,
        data.section6.warrantyPolicy,
        data.section6.brands,
      ]),
    },
    {
      step: 6,
      title: dict.s7.title,
      incomplete: !data.section7.references.some((reference) =>
        hasAnswer([reference.client, reference.contact, reference.phoneEmail, reference.product])
      ),
    },
    {
      step: 7,
      title: dict.s8.title,
      incomplete: data.section8.compliance.some((question) => !question.answer),
    },
    {
      step: 8,
      title: dict.s9.title,
      incomplete: requiredRefs.some(
        (ref) =>
          !documents.find((document) => document.ref === ref)?.checked ||
          !attached.some((document) => document.ref === ref)
      ),
    },
    {
      step: 9,
      title: dict.s10.title,
      incomplete: data.section10.authorizations.length < 4,
    },
    {
      step: 10,
      title: dict.s11.title,
      incomplete:
        !data.section11.signerName.trim() ||
        !data.section11.signatureDataUrl ||
        !data.section11.signatureConsent,
    },
  ].filter((section) => section.incomplete);

  return (
    <div className="space-y-4">
      <section
        aria-labelledby="review-summary-title"
        className={`rounded-2xl border p-4 sm:p-5 ${
          incompleteSections.length > 0
            ? "border-amber-200 bg-amber-50/70"
            : "border-emerald-200 bg-emerald-50/70"
        }`}
      >
        <h3 id="review-summary-title" className="font-display text-sm font-semibold text-slate-900">
          {dict.wizard.reviewSummaryTitle}
        </h3>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-700">
          {dict.wizard.reviewSummaryIntro}
        </p>
        {incompleteSections.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {incompleteSections.map((section) => (
              <li key={section.step}>
                <button
                  type="button"
                  onClick={() => onEdit(section.step)}
                  className="text-left text-[12.5px] font-medium text-navy-800 underline decoration-navy-800/30 underline-offset-2 hover:decoration-navy-800"
                >
                  {dict.wizard.reviewSummaryAction}: {section.title}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p role="status" className="mt-2 text-[12.5px] font-medium text-emerald-800">
            {dict.wizard.reviewSummaryComplete}
          </p>
        )}
      </section>
      <SectionCard
        title={dict.s1.title}
        step={0}
        onEdit={onEdit}
        body={
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <KV k={dict.s1.providerType} v={dict.s1.pTypes[data.section1.providerType as keyof typeof dict.s1.pTypes]} />
            <KV k={dict.s1.legalName} v={data.section1.legalName} />
            <KV k={dict.s1.commercialName} v={data.section1.commercialName} />
            <KV k={dict.s1.taxId} v={data.section1.taxId} />
            <KV k={dict.s1.nationality} v={countryName(data.section1.nationality, lang)} />
            <KV k={dict.s1.registryNo} v={data.section1.registryNo} />
            <KV k={dict.s1.registryExpiry} v={data.section1.registryExpiry} />
            <KV k={dict.s1.exporterCodeExpiry} v={data.section1.exporterCodeExpiry} />
            <KV k={dict.s1.provinceCountry} v={data.section1.provinceCountry} />
            <KV k={dict.s1.phoneEmail} v={data.section1.phoneEmail} />
            <KV k={dict.s1.mainEconomicActivity} v={data.section1.mainEconomicActivity} />
          </dl>
        }
      />
      <SectionCard
        title={dict.s2.title}
        step={1}
        onEdit={onEdit}
        body={
          <div className="space-y-2">
            {data.section2.contacts.filter((c) => c.name || c.email).map((c, i) => (
              <div key={i} className="text-[13px]">
                <span className="text-ink-soft">{dict.s2.roles[c.role as keyof typeof dict.s2.roles] ?? c.role}:</span>{" "}
                <span className="text-ink">{c.name}</span>
                {c.position && <span className="text-ink-muted"> — {c.position}</span>}
                {c.phone && <span className="text-ink-muted"> · {c.phone}</span>}
                {c.email && <span className="text-ink-muted"> · {c.email}</span>}
              </div>
            ))}
          </div>
        }
      />
      <SectionCard
        title={dict.s3.title}
        step={2}
        onEdit={onEdit}
        body={
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <KV k={dict.s3.legalRepName} v={data.section3.legalRepName} />
            <KV k={dict.s3.legalRepId} v={data.section3.legalRepId} />
            <KV k={dict.s3.shareholders} v={data.section3.shareholders} />
            {data.section3.pep && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{dict.s3.pep}</dt>
                <dd className="mt-0.5 text-[13px]">
                  <YesNo v={data.section3.pep} />
                  {data.section3.pep === "si" && data.section3.pepDetail && (
                    <span className="block text-ink-soft">{data.section3.pepDetail}</span>
                  )}
                </dd>
              </div>
            )}
            {data.section3.relatedToSbc && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{dict.s3.relatedToSbc}</dt>
                <dd className="mt-0.5 text-[13px]">
                  <YesNo v={data.section3.relatedToSbc} />
                </dd>
              </div>
            )}
            <KV k={dict.s3.relatedCompanies} v={data.section3.relatedCompanies} />
          </dl>
        }
      />
      <SectionCard
        title={dict.s4.title}
        step={3}
        onEdit={onEdit}
        body={
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <KV
              k={dict.s4.taxCondition}
              v={dict.s4.taxConditions[data.section4.taxCondition as keyof typeof dict.s4.taxConditions]}
            />
            <KV k={dict.s4.withholdings} v={data.section4.withholdings} />
            <KV
              k={dict.s4.specialRegime}
              v={data.section4.specialRegime
                .map((x) => dict.s4.specialRegimeOptions[x as keyof typeof dict.s4.specialRegimeOptions])
                .join(", ")}
            />
          </dl>
        }
      />
      <SectionCard
        title={dict.s5.title}
        step={4}
        onEdit={onEdit}
        body={
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <KV k={dict.s5.bank} v={data.section5.bank} />
            <KV k={dict.s5.accountHolder} v={data.section5.accountHolder} />
            <KV k={dict.s5.currency} v={data.section5.currency} />
            <KV k={dict.s5.paymentTerms} v={data.section5.paymentTerms.join(", ")} />
            {data.section5.offersCredit && (
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{dict.s5.offersCredit}</dt>
                <dd className="mt-0.5 text-[13px]">
                  <YesNo v={data.section5.offersCredit} />
                  {data.section5.offersCredit === "si" && (data.section5.creditCompanies?.length ?? 0) > 0 && (
                    <span className="block text-ink-soft">{(data.section5.creditCompanies ?? []).join(", ")}</span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        }
      />
      <SectionCard
        title={dict.s6.title}
        step={5}
        onEdit={onEdit}
        body={
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <KV k={dict.s6.yearsExperience} v={data.section6.yearsExperience} />
            <KV k={dict.s6.coverage} v={data.section6.coverage.join(", ")} />
            <KV k={dict.s6.supplyCapacity} v={optionLabel(data.section6.supplyCapacity, dict.s6.supplyCapacityOptions)} />
            <KV k={dict.s6.avgDeliveryTime} v={optionLabel(data.section6.avgDeliveryTime, dict.s6.avgDeliveryTimeOptions)} />
            <KV k={dict.s6.warrantyPolicy} v={data.section6.warrantyPolicy} />
            <KV k={dict.s6.warrantyDocLabel} v={warrantyDoc?.file_name} />
            <KV k={dict.s6.brands} v={data.section6.brands} />
          </dl>
        }
      />
      <SectionCard
        title={dict.s7.title}
        step={6}
        onEdit={onEdit}
        body={
          <div className="space-y-2">
            {data.section7.references.filter((r) => r.client || r.contact).map((r, i) => (
              <div key={i} className="text-[13px]">
                <span className="font-medium text-ink">{r.client}</span>
                <span className="text-ink-muted">
                  {" "}
                  · {r.contact} · {r.phoneEmail} · {r.product}
                </span>
              </div>
            ))}
            {!data.section7.references.some((r) => r.client || r.contact) && (
              <p className="text-[13px] text-ink-muted">—</p>
            )}
          </div>
        }
      />
      <SectionCard
        title={dict.s8.title}
        step={7}
        onEdit={onEdit}
        body={
          <div className="space-y-2">
            {data.section8.compliance.map((c, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[13px]">
                <span className="mt-0.5 text-ink-muted">{idx + 1}.</span>
                <span className="flex-1 text-ink">
                  {dict.s8.questions[idx]}
                  {c.answer && (
                    <span className="ml-1">
                      — <YesNo v={c.answer} />
                    </span>
                  )}
                  {c.answer === "si" && c.explanation && (
                    <span className="block text-ink-soft">{c.explanation}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        }
      />
      <SectionCard
        title={dict.s9.title}
        step={8}
        onEdit={onEdit}
        body={
          <div className="space-y-2">
            {visibleDocs.length === 0 && <p className="text-[13px] text-ink-muted">—</p>}
            {visibleDocs.map((d) => {
              const num = attached.filter((a) => a.ref === d.ref).length;
              return (
                <div key={d.ref} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex min-w-0 items-center gap-2 text-ink">
                    <span className="grid h-6 w-8 shrink-0 place-items-center rounded-md bg-navy-800 text-[11px] font-semibold text-white">
                      {d.ref}
                    </span>
                    <span className="line-clamp-1">{dict.s9.docDescriptions[d.ref as keyof typeof dict.s9.docDescriptions]}</span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0",
                      num > 0 ? "font-medium text-success" : "text-warning"
                    )}
                  >
                    {num > 0 ? `${num} — ${dict.docs.uploaded}` : dict.docs.pending}
                  </span>
                </div>
              );
            })}
          </div>
        }
      />
      <SectionCard
        title={dict.s10.title}
        step={9}
        onEdit={onEdit}
        body={
          <p className="text-[13px]">
            {data.section10.authorizations.length >= 4 ? (
              <span className="font-medium text-success">✓ {dict.docs.uploaded}</span>
            ) : (
              <span className="text-ink-muted">{data.section10.authorizations.length}/4</span>
            )}
          </p>
        }
      />
      <SectionCard
        title={dict.s11.title}
        step={10}
        onEdit={onEdit}
        body={
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <KV k={dict.s11.signerName} v={data.section11.signerName} />
            <KV k={dict.s11.signerRole} v={data.section11.signerRole} />
            {data.section11.signedDate && (
              <KV k={dict.s11.signDate} v={formatDate(data.section11.signedDate, lang)} />
            )}
          </dl>
        }
      />
    </div>
  );
}

function SectionCard({
  title,
  step,
  body,
  onEdit,
}: {
  title: string;
  step: number;
  body: React.ReactNode;
  onEdit: (step: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-navy-800/10 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="font-display text-[15px] font-semibold text-navy-900">{title}</h4>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="shrink-0 text-[12px] font-medium text-navy-700 underline decoration-navy-700/30 underline-offset-2 hover:decoration-navy-700"
        >
          Editar
        </button>
      </div>
      {body}
    </div>
  );
}