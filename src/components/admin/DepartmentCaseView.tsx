export interface DepartmentCaseSection {
  title: string;
  values: unknown;
  labels: Record<string, string>;
}

export interface DepartmentCaseIndicator {
  label: string;
  value: string;
}

export interface DepartmentCaseBar {
  label: string;
  value: number;
  max: number;
  tone: "positive" | "neutral" | "negative";
}

const BAR_TONES: Record<DepartmentCaseBar["tone"], string> = {
  positive: "bg-emerald-500",
  neutral: "bg-amber-500",
  negative: "bg-rose-500",
};

export interface DepartmentCaseDocument {
  id: string;
  registration_id: string;
  ref: string;
  file_name: string | null;
  file_size: number | null;
}

function humanize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasContent(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.some(hasContent);
  if (isRecord(value)) {
    return Object.entries(value).some(
      ([key, item]) => key !== "_ui" && key !== "signatureDataUrl" && hasContent(item)
    );
  }
  return true;
}

function ValueTree({
  value,
  labels,
  yesLabel,
  noLabel,
}: {
  value: unknown;
  labels: Record<string, string>;
  yesLabel: string;
  noLabel: string;
}) {
  if (Array.isArray(value)) {
    const items = value.filter(hasContent);
    if (!items.length) return <span className="text-slate-400">—</span>;
    if (items.every((item) => !isRecord(item) && !Array.isArray(item))) {
      return <span>{items.map(String).join(", ")}</span>;
    }
    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <ValueTree
              value={item}
              labels={labels}
              yesLabel={yesLabel}
              noLabel={noLabel}
            />
          </div>
        ))}
      </div>
    );
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).filter(
      ([key, item]) =>
        key !== "_ui" && key !== "signatureDataUrl" && hasContent(item)
    );
    if (!entries.length) return <span className="text-slate-400">—</span>;
    return (
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {entries.map(([key, item]) => (
          <div key={key} className="min-w-0">
            <dt className="text-xs font-semibold text-slate-500">
              {labels[key] ?? humanize(key)}
            </dt>
            <dd className="mt-1 break-words text-sm text-slate-800">
              <ValueTree
                value={item}
                labels={labels}
                yesLabel={yesLabel}
                noLabel={noLabel}
              />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (typeof value === "boolean") {
    return <span>{value ? yesLabel : noLabel}</span>;
  }
  return <span>{String(value)}</span>;
}

export function DepartmentCaseView({
  company,
  reference,
  status,
  risk,
  sections,
  documents,
  documentsTitle,
  noDocuments,
  openDocument,
  yesLabel,
  noLabel,
  indicators,
  bars,
  indicatorsTitle,
  completenessTitle,
  completenessLabel,
}: {
  company: string;
  reference: string | null;
  status: string;
  risk: string | null;
  sections: DepartmentCaseSection[];
  documents: DepartmentCaseDocument[];
  documentsTitle: string;
  noDocuments: string;
  openDocument: string;
  yesLabel: string;
  noLabel: string;
  indicators?: DepartmentCaseIndicator[];
  bars?: DepartmentCaseBar[];
  indicatorsTitle?: string;
  completenessTitle?: string;
  completenessLabel?: string;
}) {
  const barList = bars ?? [];
  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h1 className="font-display text-2xl font-semibold text-navy-900">
          {company}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {reference ?? "—"} · {status} · {risk ?? "—"}
        </p>
      </section>

      {indicators && indicators.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          {indicatorsTitle && (
            <h2 className="mb-4 border-b border-slate-100 pb-3 font-semibold text-navy-900">
              {indicatorsTitle}
            </h2>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {indicators.map((indicator) => (
              <div
                key={indicator.label}
                className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {indicator.label}
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-navy-900">
                  {indicator.value}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {barList.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-4 border-b border-slate-100 pb-3 font-semibold text-navy-900">
            {completenessTitle ?? completenessLabel}
          </h2>
          <div className="space-y-3">
            {barList.map((bar) => {
              const pct = bar.max > 0 ? Math.round((bar.value / bar.max) * 100) : 0;
              return (
                <div key={bar.label}>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{bar.label}</span>
                    <span className="font-semibold tabular-nums">
                      {bar.value}/{bar.max} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${BAR_TONES[bar.tone]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
        >
          <h2 className="mb-4 border-b border-slate-100 pb-3 font-semibold text-navy-900">
            {section.title}
          </h2>
          <ValueTree
            value={section.values}
            labels={section.labels}
            yesLabel={yesLabel}
            noLabel={noLabel}
          />
        </section>
      ))}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="mb-4 border-b border-slate-100 pb-3 font-semibold text-navy-900">
          {documentsTitle}
        </h2>
        {documents.length ? (
          <ul className="divide-y divide-slate-100">
            {documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {document.file_name ?? document.ref}
                  </p>
                  <p className="text-xs text-slate-500">
                    {document.ref}
                    {document.file_size ? ` · ${Math.ceil(document.file_size / 1024)} KB` : ""}
                  </p>
                </div>
                <a
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-navy-800 hover:bg-slate-50"
                  href={`/api/admin/doc/${document.registration_id}/${document.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {openDocument}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{noDocuments}</p>
        )}
      </section>
    </div>
  );
}
