"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Logo, Button, Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";

export default function AdminLoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(t("admin.login.error"));
      setLoading(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col bg-bone-50">
      <header className="mx-auto flex h-16 w-full max-w-md items-center justify-between px-4">
        <Logo dark />
        <LangToggle />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 pb-16">
        <div className="w-full rounded-3xl border border-navy-800/10 bg-white p-6 shadow-[0_1px_2px_rgba(10,28,49,0.04)] sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-navy-900">
            {t("admin.login.title")}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            {t("admin.login.subtitle")}
          </p>
          <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">
                {t("admin.login.email")}
              </span>
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sanchezbusinesscorp.com"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">
                {t("admin.login.password")}
              </span>
              <Input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <p className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-[13px] text-danger">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? t("common.loading") : t("admin.login.signIn")}
            </Button>
          </form>
          <p className="mt-5 text-[11.5px] leading-relaxed text-ink-muted">
            {t("admin.login.noAccount")}
          </p>
        </div>
      </main>
    </div>
  );
}