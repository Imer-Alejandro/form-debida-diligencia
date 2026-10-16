import { NextResponse } from "next/server";
import { runAlertEngine, runSlaMonitor } from "@/lib/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // With no secret configured, allow only in local development.
  if (!secret) return process.env.NODE_ENV !== "production";
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("key") === secret;
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const [alerts, sla] = await Promise.all([
      runAlertEngine(),
      runSlaMonitor(),
    ]);
    return NextResponse.json({ ok: true, alerts, sla });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;
