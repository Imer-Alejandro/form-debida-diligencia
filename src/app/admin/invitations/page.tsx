import QRCode from "qrcode";
import { getAdminSession } from "@/lib/supabase/auth";
import { getServerDict } from "@/lib/i18n/server";
import type { InvitationRow } from "@/lib/types";
import { NewInvitation } from "@/components/admin/NewInvitation";
import { InvitationList } from "@/components/admin/InvitationList";

export const dynamic = "force-dynamic";

export default async function AdminInvitationsPage() {
  const dict = await getServerDict();
  const inv = dict.admin.invitations;

  const { supabase } = await getAdminSession();

  const { data } = await supabase
    .from("invitations")
    .select(
      "id, token, supplier_name, supplier_email, status, language, created_at, expires_at, last_opened_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (data ?? []) as Pick<
    InvitationRow,
    | "id"
    | "token"
    | "supplier_name"
    | "supplier_email"
    | "status"
    | "language"
    | "created_at"
    | "expires_at"
    | "last_opened_at"
  >[];

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const qrMap: Record<string, string> = {};
  await Promise.all(
    items.map(async (i) => {
      try {
        qrMap[i.token] = await QRCode.toDataURL(`${base}/i/${i.token}`, {
          width: 384,
          margin: 2,
          color: { dark: "#0a1c31", light: "#ffffff" },
        });
      } catch {
        /* skip */
      }
    })
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">
          {inv.title}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{inv.subtitle}</p>
      </div>

      <h2 className="mb-3 font-display text-[15px] font-semibold text-navy-900">
        {inv.new}
      </h2>
      <NewInvitation />

      <p className="mb-3 mt-8 text-[12.5px] leading-relaxed text-ink-muted">
        {inv.tokenNote}
      </p>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-navy-800/10 bg-white px-6 py-12 text-center text-sm text-ink-muted">
          {inv.listEmpty}
        </p>
      ) : (
        <InvitationList items={items} qrMap={qrMap} />
      )}
    </div>
  );
}