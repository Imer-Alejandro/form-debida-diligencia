"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { WizardShell } from "@/components/wizard/WizardShell";
import { InternalReportForm, StatusCard } from "@/components/internal/InternalReportForm";
import { useI18n } from "@/lib/i18n";

type Access = {
  kind: "FIRST_PURCHASE" | "INCIDENT";
  status: string;
  area?: string | null;
  company?: string;
  reference?: string;
};

export default function InternalReportPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === "string" ? params.token : "";
  const { t } = useI18n();
  const [state, setState] = useState<"loading" | "invalid" | "used" | "expired" | "ready">(
    "loading"
  );
  const [access, setAccess] = useState<Access | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/internal/context?token=${encodeURIComponent(token)}`);
      const json = await res.json().catch(() => null);
      if (cancelled) return;
      if (!res.ok || !json?.access) {
        setState("invalid");
        return;
      }
      const a = json.access as Access;
      setAccess(a);
      if (a.status === "USADO") setState("used");
      else if (a.status === "EXPIRADO") setState("expired");
      else setState("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <WizardShell>
      {state === "loading" && <p className="text-sm text-ink-muted">{t("internal.loading")}</p>}
      {state === "invalid" && (
        <StatusCard
          tone="warn"
          title={t("internal.invalidTitle")}
          body={t("internal.invalidBody")}
        />
      )}
      {state === "used" && (
        <StatusCard tone="ok" title={t("internal.usedTitle")} body={t("internal.usedBody")} />
      )}
      {state === "expired" && (
        <StatusCard
          tone="warn"
          title={t("internal.expiredTitle")}
          body={t("internal.expiredBody")}
        />
      )}
      {state === "ready" && access && (
        <InternalReportForm
          token={token}
          kind={access.kind}
          defaultArea={access.area ?? ""}
          company={access.company ?? ""}
          reference={access.reference ?? ""}
        />
      )}
    </WizardShell>
  );
}
