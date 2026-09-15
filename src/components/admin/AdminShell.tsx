"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/ui";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", key: "dashboard", icon: "grid" },
  { href: "/admin/suppliers", key: "suppliers", icon: "users" },
  { href: "/admin/invitations", key: "invitations", icon: "qr" },
  { href: "/admin/settings", key: "settings", icon: "gear" },
] as const;

const ICONS: Record<string, ReactNode> = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  qr: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3z" />
      <path d="M20 14v.01M20 20v.01M16 20h.01" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

export function AdminShell({
  children,
  email,
}: {
  children: ReactNode;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-bone-50">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-navy-800/10 bg-white lg:w-60">
        <div className="flex h-16 items-center justify-center border-b border-navy-800/10 lg:justify-start lg:px-5">
          <Link href="/admin" aria-label="Panel">
            <Logo dark compact />
          </Link>
          <span className="ml-3 hidden font-display text-[15px] font-semibold text-navy-900 lg:block">
            Proveedores
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-navy-800 text-white"
                    : "text-ink-soft hover:bg-navy-800/5 hover:text-navy-800"
                )}
                title={t(`admin.nav.${item.key}`)}
              >
                {ICONS[item.icon]}
                <span className="hidden lg:inline">{t(`admin.nav.${item.key}`)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-navy-800/10 p-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-navy-800/5"
            title={t("admin.nav.viewSite")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span className="hidden lg:inline">{t("admin.nav.viewSite")}</span>
          </a>
          <button
            onClick={() => void signOut()}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-medium text-ink-soft transition-colors hover:bg-danger/5 hover:text-danger disabled:opacity-50"
            title={t("admin.nav.signOut")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="hidden lg:inline">
              {signingOut ? t("common.loading") : t("admin.nav.signOut")}
            </span>
          </button>
        </div>
      </aside>

      <div className="pl-16 lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-navy-800/10 bg-bone-50/90 px-4 backdrop-blur sm:px-6">
          <span className="text-[13px] font-medium text-ink-muted">{email}</span>
          <div className="flex items-center gap-4">
            {/* mobile mini-nav */}
            <nav className="flex gap-1 lg:hidden">
              {NAV.map((item) => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-lg p-2 transition-colors",
                      active ? "bg-navy-800 text-white" : "text-ink-muted hover:text-navy-800"
                    )}
                    aria-label={t(`admin.nav.${item.key}`)}
                  >
                    {ICONS[item.icon]}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}