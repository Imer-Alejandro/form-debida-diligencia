"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LangToggle } from "@/components/LangToggle";

type NavKey = "dashboard" | "suppliers" | "invitations" | "users" | "settings";

interface NavItem {
  href: string;
  key: NavKey;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "MENÚ PRINCIPAL",
    items: [
      { href: "/admin", key: "dashboard", icon: "grid" },
    ],
  },
  {
    label: "GESTIÓN",
    items: [
      { href: "/admin/suppliers", key: "suppliers", icon: "users" },
      { href: "/admin/invitations", key: "invitations", icon: "qr" },
    ],
  },
  {
    label: "SISTEMA",
    items: [
      { href: "/admin/users", key: "users", icon: "key" },
      { href: "/admin/settings", key: "settings", icon: "gear" },
    ],
  },
];

const ICONS: Record<string, ReactNode> = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  qr: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <path d="M14 14h3v3h-3z" />
      <path d="M20 14v.01M20 20v.01M16 20h.01" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  key: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
};

const ALL_NAV = NAV_GROUPS.flatMap((g) => g.items);

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
  const [searchVal, setSearchVal] = useState("");

  const activeKey =
    ALL_NAV.find(
      (n) => (n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href))
    )?.key ?? "dashboard";
  const initial = (email || "?").trim().charAt(0).toUpperCase();

  const signOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/admin/suppliers?q=${encodeURIComponent(searchVal.trim())}`);
    } else {
      router.push("/admin/suppliers");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col border-r border-slate-200/80 bg-white shadow-[0_0_24px_rgba(15,23,42,0.03)] lg:w-64">
        {/* Brand header */}
        <div className="flex h-16 items-center justify-center gap-3 border-b border-slate-100 px-3 lg:justify-start lg:px-5">
          <Link href="/admin" aria-label="Panel" className="flex items-center gap-3 group">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900 text-white shadow-xs group-hover:scale-105 transition-transform">
              <span className="text-[15px] font-bold">S</span>
              <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-teal-600" />
            </span>
            <span className="hidden lg:block">
              <span className="block font-display text-[14px] font-bold leading-tight text-slate-900">
                Sanchez Business
              </span>
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Debida Diligencia
              </span>
            </span>
          </Link>
        </div>

        {/* Quick CTA button */}
        <div className="hidden px-3 pt-3.5 lg:block">
          <Link
            href="/admin/invitations"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-navy-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Nueva Invitación</span>
          </Link>
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 space-y-5 px-3 py-4 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="hidden px-3 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 lg:block mb-1.5">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                      active
                        ? "bg-navy-900 text-white shadow-xs font-semibold"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                    title={t(`admin.nav.${item.key}` as never)}
                  >
                    <span className={active ? "text-white" : "text-slate-400 group-hover:text-slate-700"}>
                      {ICONS[item.icon]}
                    </span>
                    <span className="hidden lg:inline">{t(`admin.nav.${item.key}` as never)}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom User Area */}
        <div className="border-t border-slate-100 p-3 space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            title={t("admin.nav.viewSite")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 text-slate-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span className="hidden lg:inline">{t("admin.nav.viewSite")}</span>
          </a>

          <div className="hidden items-center gap-3 rounded-xl bg-slate-50 border border-slate-200/60 px-3 py-2.5 lg:flex">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[12px] font-bold text-white shadow-2xs">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-semibold text-slate-800">
                {email}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t("admin.login.signedIn")}
              </span>
            </span>
          </div>

          <button
            onClick={() => void signOut()}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12.5px] font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
            title={t("admin.nav.signOut")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
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

      {/* Main Content Area */}
      <div className="pl-16 lg:pl-64">
        {/* Floating Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-md sm:px-6">
          {/* Breadcrumb */}
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden items-center gap-2 text-[13px] text-slate-400 lg:flex">
              <span className="font-semibold text-slate-700">Panel</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="font-bold text-slate-900">
                {t(`admin.nav.${activeKey}` as never)}
              </span>
            </span>
            <span className="flex size-9 items-center justify-center rounded-full bg-navy-900 text-[12.5px] font-bold text-white lg:hidden shadow-xs">
              {initial}
            </span>
          </div>

          {/* Quick Search and Session Info */}
          <div className="flex items-center gap-3">
            {/* Quick search input (inspired by image 1 and 3) */}
            <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Buscar proveedor o referencia..."
                className="h-9 w-64 rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-12 text-xs text-slate-800 placeholder:text-slate-400 transition-colors focus:border-navy-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-700/10"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                ⌘K
              </span>
            </form>

            <LangToggle />

            {/* Mobile Navigation bar */}
            <nav className="flex gap-1 lg:hidden">
              {ALL_NAV.map((item) => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-lg p-2 transition-colors",
                      active ? "bg-navy-900 text-white" : "text-slate-400 hover:text-slate-800"
                    )}
                    aria-label={t(`admin.nav.${item.key}` as never)}
                  >
                    {ICONS[item.icon]}
                  </Link>
                );
              })}
            </nav>

            <span className="hidden max-w-48 truncate text-xs font-semibold text-slate-600 sm:inline">
              {email}
            </span>
          </div>
        </header>

        {/* Content Container */}
        {children}
      </div>
    </div>
  );
}