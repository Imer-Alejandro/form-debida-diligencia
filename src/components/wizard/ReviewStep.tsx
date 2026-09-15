"use client";

import { useDict, useI18n } from "@/lib/i18n";
import type { DocumentIntent, DocumentRow, SupplierData } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function KV({ k, v }: { k: string; v?: string }) {
  if (!v || !v.trim()) return null;
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{k}</dt>
      <dd className="mt-0.5 text-[13px] leading-snug text-ink">{v}</dd>
    </div>
  );
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

  return (
    <div className="space-y-4">
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
            <KV k={dict.s1.registryNo} v={data.section1.registryNo} />
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
            <KV k={dict.s6.supplyCapacity} v={data.section6.supplyCapacity} />
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
                  <span className="flex items-center gap-2 text-ink">
                    <span className="grid h-6 w-8 place-items-center rounded-md bg-navy-800 text-[11px] font-semibold text-white">
                      {d.ref}
                    </span>
                    <span className="line-clamp-1">
                      {dict.s9.docDescriptions[d.ref as keyof typeof dict.s9.docDescriptions]}
                    </span>
                  </span>
                  <span className={num > 0 ? "font-medium text-success" : "text-warning"}>
                    {num > 0 ? `${num} — ${dict.docs.uploaded}` : dict.docs.noUploadsYet}
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