"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select } from "@/components/ui";
import { useDict } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type { AdminUserRow } from "@/app/api/admin/users/route";

export function UsersManager({
  items,
  configured,
  departments,
}: {
  items: AdminUserRow[];
  configured: boolean;
  departments: { id: string; name: string }[];
}) {
  const dict = useDict();
  const u = dict.admin.users;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState("READ_ONLY");
  const [newDepartment, setNewDepartment] = useState("");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [departmentDrafts, setDepartmentDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

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
        body: JSON.stringify({
          email,
          password,
          role: newRole,
          department: newRole === "DEPARTMENT_REVIEWER" ? newDepartment : null,
        }),
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
      setNewRole("READ_ONLY");
      setNewDepartment("");
      setFlash(u.created);
      router.refresh();
    } catch {
      setError(u.errorCreate);
    } finally {
      setBusy(false);
    }
  };

  const saveRole = async (row: AdminUserRow) => {
    const selectedRole = roleDrafts[row.id] ?? row.role ?? "";
    const selectedDepartment =
      departmentDrafts[row.id] ?? row.department ?? "";
    setError(null);
    setSavingRoleId(row.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          role: selectedRole,
          department:
            selectedRole === "DEPARTMENT_REVIEWER" ? selectedDepartment : null,
        }),
      });
      const result = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(result?.error === "last_admin" ? u.errorLastAdmin : u.errorRole);
        return;
      }
      setFlash(u.roleSaved);
      router.refresh();
    } catch {
      setError(u.errorRole);
    } finally {
      setSavingRoleId(null);
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
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="font-display text-[15px] font-bold text-slate-900">
          {u.new}
        </h2>
        <form onSubmit={(e) => void create(e)} className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
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
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
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
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              {u.role}
            </span>
            <Select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              <option value="ADMIN">{u.roleAdmin}</option>
              <option value="MANAGEMENT">{u.roleManagement}</option>
              <option value="PURCHASING">{u.rolePurchasing}</option>
              <option value="DEPARTMENT_REVIEWER">{u.roleReviewer}</option>
              <option value="READ_ONLY">{u.roleReadOnly}</option>
            </Select>
          </label>
          {newRole === "DEPARTMENT_REVIEWER" && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">
                {u.department}
              </span>
              <Select
                required
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
              >
                <option value="">{u.selectDepartment}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <div className="flex items-end">
            <Button type="submit" disabled={busy}>
              {busy ? dict.common.saving : u.create}
            </Button>
          </div>
        </form>
        {(error || flash) && (
          <p
            className={`mt-4 rounded-xl border px-4 py-3 text-xs font-medium ${
              error
                ? "border-rose-200/80 bg-rose-50/70 text-rose-600"
                : "border-emerald-200/80 bg-emerald-50/70 text-emerald-700"
            }`}
          >
            {error ?? flash}
          </p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          {u.passwordHint}
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-display text-[15px] font-bold text-slate-900">
          {u.listTitle}
        </h2>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-slate-200/80 bg-white px-6 py-12 text-center text-sm text-slate-400 shadow-xs">
            {u.empty}
          </p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            {items.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{row.email}</p>
                  <p className="text-xs text-slate-400">
                    {u.createdCol} {row.createdAt ? formatDate(row.createdAt) : "—"}
                    {" · "}
                    {u.lastSignIn} {row.lastSignIn ? formatDate(row.lastSignIn) : "—"}
                  </p>
                </div>
                <div className="flex min-w-48 flex-1 items-center gap-2">
                  <Select
                    aria-label={`${u.role}: ${row.email}`}
                    value={roleDrafts[row.id] ?? row.role ?? ""}
                    onChange={(e) =>
                      setRoleDrafts((current) => ({
                        ...current,
                        [row.id]: e.target.value,
                      }))
                    }
                  >
                    <option value="">{u.roleUnassigned}</option>
                    <option value="ADMIN">{u.roleAdmin}</option>
                    <option value="MANAGEMENT">{u.roleManagement}</option>
                    <option value="PURCHASING">{u.rolePurchasing}</option>
                    <option value="DEPARTMENT_REVIEWER">{u.roleReviewer}</option>
                    <option value="READ_ONLY">{u.roleReadOnly}</option>
                  </Select>
                  {(roleDrafts[row.id] ?? row.role) === "DEPARTMENT_REVIEWER" && (
                    <Select
                      aria-label={`${u.department}: ${row.email}`}
                      value={departmentDrafts[row.id] ?? row.department ?? ""}
                      onChange={(e) =>
                        setDepartmentDrafts((current) => ({
                          ...current,
                          [row.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">{u.selectDepartment}</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </Select>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={
                      savingRoleId === row.id ||
                      !(roleDrafts[row.id] ?? row.role)
                    }
                    onClick={() => void saveRole(row)}
                  >
                    {savingRoleId === row.id ? dict.common.saving : u.saveRole}
                  </Button>
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