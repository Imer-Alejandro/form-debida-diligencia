import { getServerDict } from "@/lib/i18n/server";
import { authUrl, readOneDriveState } from "@/lib/onedrive";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const dict = await getServerDict();
  const st = dict.admin.settings;
  const state = await readOneDriveState();
  const connectUrl = authUrl();
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
          {st.title}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{dict.brand.tagline}</p>
      </div>

      <section className="rounded-2xl border border-navy-800/10 bg-white p-5 sm:p-6">
        <h2 className="font-display text-[16px] font-semibold text-navy-900">
          {st.subsection_onedrive}
        </h2>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Badge tone={state.configured ? "green" : "amber"}>
              {state.configured ? st.onedrive_configured : st.onedrive_notconfigured}
            </Badge>
            {state.account && (
              <p className="text-[13px] text-ink-soft">
                {st.onedrive_account}:{" "}
                <span className="font-medium text-ink">{state.account}</span>
              </p>
            )}
          </div>
          {!state.configured && (
            <a
              href={connectUrl}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-navy-800 px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-700"
            >
              {st.connect}
            </a>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-navy-800/10 bg-white p-5 sm:p-6">
        <h2 className="font-display text-[16px] font-semibold text-navy-900">
          {st.steps}
        </h2>
        <ol className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-ink-soft">
          <li><span className="font-medium text-ink">1.</span> {st.st1}</li>
          <li><span className="font-medium text-ink">2.</span> {st.st2}{" "}
            <code className="inline-block rounded-md bg-bone-100 px-2 py-0.5 text-[12px] text-navy-800">
              {base}/api/onedrive/callback
            </code>
          </li>
          <li><span className="font-medium text-ink">3.</span> {st.st3}</li>
          <li><span className="font-medium text-ink">4.</span> {st.st4}</li>
          <li><span className="font-medium text-ink">5.</span> {st.st5}</li>
          <li><span className="font-medium text-ink">6.</span> {st.st6}</li>
        </ol>
      </section>

      <section className="mt-5 rounded-2xl border border-navy-800/10 bg-white p-5 sm:p-6">
        <h2 className="font-display text-[16px] font-semibold text-navy-900">
          {st.docs_section}
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
          {st.docs_note}
        </p>
      </section>
    </div>
  );
}