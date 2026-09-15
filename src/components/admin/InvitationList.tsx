"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui";

export interface InvitationItem {
  id: string;
  supplier_name: string;
  supplier_email: string;
  status: "sent" | "in_progress" | "completed";
  created_at: string;
  expires_at: string | null;
  last_opened_at: string | null;
  token: string;
}

const STATUS_TONE = {
  sent: "gray" as const,
  in_progress: "amber" as const,
  completed: "green" as const,
};

export function InvitationList({
  items,
  qrMap,
}: {
  items: InvitationItem[];
  qrMap: Record<string, string>;
}) {
  const { t } = useI18n();
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${base}/i/${token}`);
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <ul className="space-y-3">
      {items.map((inv) => {
        const url = `${base}/i/${inv.token}`;
        return (
          <li
            key={inv.id}
            className="rounded-2xl border border-navy-800/10 bg-white p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {qrMap[inv.token] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrMap[inv.token]}
                  alt={`QR ${inv.supplier_name}`}
                  width={96}
                  height={96}
                  className="shrink-0 rounded-lg border border-navy-800/10"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-ink">
                    {inv.supplier_name || "—"}
                  </p>
                  <Badge tone={STATUS_TONE[inv.status]}>
                    {t(`admin.invitations.status.${inv.status}` as never)}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">
                  {inv.supplier_email || `/${inv.token.slice(0, 10)}…`}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="truncate rounded-md bg-bone-100 px-2 py-1 text-[12px] text-ink-soft">
                    {url}
                  </code>
                  <button
                    onClick={() => void copy(inv.token)}
                    className="text-[12.5px] font-medium text-navy-700 underline underline-offset-2"
                  >
                    {copied === inv.token ? "✓" : t("admin.invitations.copyLink")}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12.5px] text-ink-muted underline underline-offset-2 hover:text-navy-700"
                  >
                    {t("admin.invitations.open")}
                  </a>
                  {qrMap[inv.token] && (
                    <a
                      href={qrMap[inv.token]}
                      download={`qr-${inv.token}.png`}
                      className="text-[12.5px] text-ink-muted underline underline-offset-2 hover:text-navy-700"
                    >
                      {t("admin.invitations.downloadQr")}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}