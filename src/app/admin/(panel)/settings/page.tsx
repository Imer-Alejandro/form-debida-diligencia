import { getServerDict } from "@/lib/i18n/server";
import { authUrl, readOneDriveState } from "@/lib/onedrive";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const connected = Array.isArray(params.connected)
    ? params.connected[0]
    : params.connected;
  const reason = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const dict = await getServerDict();
  const st = dict.admin.settings;
  const state = await readOneDriveState();
  const clientIdConfigured = Boolean(process.env.ONEDRIVE_CLIENT_ID);
  const connectUrl = clientIdConfigured ? authUrl() : null;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {st.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{dict.brand.tagline}</p>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="font-display text-[15px] font-bold text-slate-900">
          {st.subsection_onedrive}
        </h2>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Badge tone={state.configured ? "green" : "amber"} withDot>
              {state.configured ? st.onedrive_configured : st.onedrive_notconfigured}
            </Badge>
            {state.account && (
              <p className="text-xs text-slate-600">
                {st.onedrive_account}:{" "}
                <span className="font-semibold text-slate-900">{state.account}</span>
              </p>
            )}
          </div>
          {!state.configured && connectUrl && (
            <a
              href={connectUrl}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-navy-800"
            >
              {st.connect}
            </a>
          )}
        </div>
        {connected === "1" && (
          <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-relaxed text-emerald-800">
            {st.onedrive_connect_success}
          </p>
        )}
        {connected === "0" && (
          <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-relaxed text-rose-800">
            {st.onedrive_connect_failure}
            {reason && <span className="mt-1 block break-words">{reason}</span>}
          </p>
        )}
        {!state.configured && !clientIdConfigured && (
          <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
            {st.onedrive_missing_client_id}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="font-display text-[15px] font-bold text-slate-900">
          {st.steps}
        </h2>
        <ol className="mt-4 space-y-3 text-xs leading-relaxed text-slate-600">
          <li><span className="font-bold text-slate-900">1.</span> {st.st1}</li>
          <li><span className="font-bold text-slate-900">2.</span> {st.st2}{" "}
            <code className="inline-block max-w-full break-all rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-800">
              {base}/api/onedrive/callback
            </code>
          </li>
          <li><span className="font-bold text-slate-900">3.</span> {st.st3}</li>
          <li><span className="font-bold text-slate-900">4.</span> {st.st4}</li>
          <li><span className="font-bold text-slate-900">5.</span> {st.st5}</li>
          <li><span className="font-bold text-slate-900">6.</span> {st.st6}</li>
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="font-display text-[15px] font-bold text-slate-900">
          {st.docs_section}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          {st.docs_note}
        </p>
      </section>
    </div>
  );
}