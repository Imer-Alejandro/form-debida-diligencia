"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { useDict } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type { AdminUserRow } from "@/app/api/admin/users/route";

export function UsersManager({
  items,
  configured,
}: {
  items: AdminUserRow[];
  configured: boolean;
}) {
  const dict = useDict();
  const u = dict.admin.users;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!configured) {
    return (
      <div className="rounded-2xl border border-warning/30 bg-warning/5 px-6 py-5 text-sm text-warning">
        {u.notConfigured}
      </div>
    );
  }

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          j?.error === "user_exists" ? u.errorExists : u.errorCreate
        );
        return;
      }
      setEmail("");
      setPassword("");
      setFlash(u.created);
      router.refresh();
    } catch {
      setError(u.errorCreate);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, emailToRemove: string) => {
    if (!window.confirm(u.deleteConfirm.replace("{email}", emailToRemove))) return;
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(j?.error === "self_delete" ? u.errorSelfDelete : u.errorDelete);
        return;
      }
      setFlash(u.deleted);
      router.refresh();
    } catch {
      setError(u.errorDelete);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-navy-800/10 bg-white p-5 sm:p-6">
        <h2 className="font-display text-[15px] font-semibold text-navy-900">
          {u.new}
        </h2>
        <form onSubmit={(e) => void create(e)} className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">
              {u.email}
            </span>
            <Input
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={u.emailPlaceholder}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink">
              {u.password}
            </span>
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={8}
            />
          </label>
          <div className="flex items-end">
            <Button type="submit" disabled={busy}>
              {busy ? dict.common.saving : u.create}
            </Button>
          </div>
        </form>
        {(error || flash) && (
          <p
            className={`mt-4 rounded-xl border px-4 py-3 text-[13px] ${
              error
                ? "border-danger/20 bg-danger/5 text-danger"
                : "border-success/20 bg-success/5 text-success"
            }`}
          >
            {error ?? flash}
          </p>
        )}
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-muted">
          {u.passwordHint}
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-display text-[15px] font-semibold text-navy-900">
          {u.listTitle}
        </h2>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-navy-800/10 bg-white px-6 py-12 text-center text-sm text-ink-muted">
            {u.empty}
          </p>
        ) : (
          <div className="divide-y divide-navy-800/5 rounded-2xl border border-navy-800/10 bg-white">
            {items.map((row) => (
              <div key={row.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{row.email}</p>
                  <p className="text-[12px] text-ink-muted">
                    {u.createdCol} {row.createdAt ? formatDate(row.createdAt) : "—"}
                    {" · "}
                    {u.lastSignIn} {row.lastSignIn ? formatDate(row.lastSignIn) : "—"}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-medium leading-none ${
                    row.confirmed
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning"
                  }`}
                >
                  {row.confirmed ? u.confirmedYes : u.confirmedNo}
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={deletingId === row.id}
                  onClick={() => void remove(row.id, row.email)}
                >
                  {deletingId === row.id ? dict.common.saving : u.delete}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}