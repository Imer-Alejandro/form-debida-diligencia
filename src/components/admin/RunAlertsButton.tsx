"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui";

interface RunSummary {
  candidates: number;
  enqueued: number;
  sent: number;
  failed: number;
  skipped: number;
  mailConfigured: boolean;
}

export function RunAlertsButton() {
  const { t } = useI18n();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/alerts/run", { method: "POST" });
      const data = (await res.json()) as ({ ok: boolean; error?: string } & RunSummary);
      if (!res.ok || !data.ok) {
        setError(data.error ? `${t("admin.alerts.runFailed")} (${data.error})` : t("admin.alerts.runFailed"));
        return;
      }
      const summary = t("admin.alerts.runResult", {
        candidates: data.candidates,
        enqueued: data.enqueued,
        sent: data.sent,
        failed: data.failed,
        skipped: data.skipped,
      });
      setResult(data.mailConfigured ? summary : `${summary} ${t("admin.alerts.mailOff")}`);
      router.refresh();
    } catch {
      setError(t("admin.alerts.runFailed"));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button onClick={() => void run()} disabled={running} size="sm">
        {running ? t("admin.alerts.running") : t("admin.alerts.run")}
      </Button>
      {result && <p className="max-w-md text-[12.5px] text-emerald-700">{result}</p>}
      {error && <p className="max-w-md text-[12.5px] text-rose-600">{error}</p>}
    </div>
  );
}
