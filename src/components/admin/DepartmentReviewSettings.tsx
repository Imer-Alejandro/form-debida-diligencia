"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { useDict } from "@/lib/i18n";

interface DepartmentSetting {
  id: string;
  name: string;
  recipient_email: string | null;
  escalation_email: string | null;
  active: boolean;
}

interface HolidaySetting {
  holiday_date: string;
  name: string;
  active: boolean;
}

export function DepartmentReviewSettings({
  departments,
  holidays,
}: {
  departments: DepartmentSetting[];
  holidays: HolidaySetting[];
}) {
  const t = useDict().admin.departmentReviews;
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, DepartmentSetting>>({});
  const [newDepartment, setNewDepartment] = useState({
    id: "",
    name: "",
    recipientEmail: "",
    escalationEmail: "",
  });
  const [holiday, setHoliday] = useState({ holidayDate: "", name: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (body: Record<string, unknown>, method = "POST") => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/review-settings", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("save_failed");
      setMessage(t.settingsSaved);
      router.refresh();
      return true;
    } catch {
      setMessage(t.settingsFailed);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveDepartment = async (department: DepartmentSetting) => {
    const draft = drafts[department.id] ?? department;
    if (
      await save({
        kind: "department",
        id: draft.id,
        name: draft.name,
        recipientEmail: draft.recipient_email,
        escalationEmail: draft.escalation_email,
        active: draft.active,
      })
    ) {
      setDrafts((current) => {
        const next = { ...current };
        delete next[department.id];
        return next;
      });
    }
  };

  const addDepartment = async (event: FormEvent) => {
    event.preventDefault();
    const saved = await save({ kind: "department", ...newDepartment });
    if (saved) setNewDepartment({ id: "", name: "", recipientEmail: "", escalationEmail: "" });
  };

  const addHoliday = async (event: FormEvent) => {
    event.preventDefault();
    const saved = await save({ kind: "holiday", ...holiday });
    if (saved) setHoliday({ holidayDate: "", name: "" });
  };

  const deleteHoliday = async (holidayDate: string) => {
    await save({ holidayDate }, "DELETE");
  };

  const update = (
    department: DepartmentSetting,
    patch: Partial<DepartmentSetting>
  ) => {
    setDrafts((current) => ({
      ...current,
      [department.id]: { ...(current[department.id] ?? department), ...patch },
    }));
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <h2 className="font-display text-lg font-semibold text-slate-900">
        {t.settingsTitle}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{t.settingsHelp}</p>
      {message && (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {message}
        </p>
      )}

      <div className="mt-5 space-y-3">
        {departments.map((department) => {
          const draft = drafts[department.id] ?? department;
          return (
            <div
              key={department.id}
              className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_1.4fr_1.4fr_auto]"
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(event) =>
                    update(department, { active: event.target.checked })
                  }
                  aria-label={`${t.active}: ${department.name}`}
                />
                <span className="text-sm font-semibold text-slate-800">
                  {department.name}
                </span>
              </div>
              <Input
                type="text"
                value={draft.recipient_email ?? ""}
                onChange={(event) =>
                  update(department, { recipient_email: event.target.value })
                }
                placeholder={t.recipientEmail}
                aria-label={`${t.recipientEmail}: ${department.name}`}
              />
              <Input
                type="text"
                value={draft.escalation_email ?? ""}
                onChange={(event) =>
                  update(department, { escalation_email: event.target.value })
                }
                placeholder={t.escalationEmail}
                aria-label={`${t.escalationEmail}: ${department.name}`}
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void saveDepartment(department)}
              >
                {t.saveSettings}
              </Button>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(event) => void addDepartment(event)}
        className="mt-4 grid gap-3 rounded-xl border border-dashed border-slate-300 p-3 md:grid-cols-5"
      >
        <Input
          required
          maxLength={32}
          value={newDepartment.id}
          onChange={(event) =>
            setNewDepartment((current) => ({
              ...current,
              id: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
            }))
          }
          placeholder={t.departmentId}
        />
        <Input
          required
          maxLength={100}
          value={newDepartment.name}
          onChange={(event) =>
            setNewDepartment((current) => ({ ...current, name: event.target.value }))
          }
          placeholder={t.departmentName}
        />
        <Input
          value={newDepartment.recipientEmail}
          onChange={(event) =>
            setNewDepartment((current) => ({
              ...current,
              recipientEmail: event.target.value,
            }))
          }
          placeholder={t.recipientEmail}
        />
        <Input
          value={newDepartment.escalationEmail}
          onChange={(event) =>
            setNewDepartment((current) => ({
              ...current,
              escalationEmail: event.target.value,
            }))
          }
          placeholder={t.escalationEmail}
        />
        <Button type="submit" disabled={busy}>{t.addDepartment}</Button>
      </form>
      <p className="mt-2 text-xs text-slate-500">{t.departmentKeyHelp}</p>

      <div className="mt-8 border-t border-slate-200 pt-5">
        <h3 className="font-semibold text-slate-900">{t.holidaysTitle}</h3>
        <p className="mt-1 text-sm text-slate-500">{t.holidaysHelp}</p>
        <form
          onSubmit={(event) => void addHoliday(event)}
          className="mt-3 flex flex-wrap gap-3"
        >
          <Input
            type="date"
            required
            value={holiday.holidayDate}
            onChange={(event) =>
              setHoliday((current) => ({
                ...current,
                holidayDate: event.target.value,
              }))
            }
            className="max-w-52"
          />
          <Input
            required
            maxLength={100}
            value={holiday.name}
            onChange={(event) =>
              setHoliday((current) => ({ ...current, name: event.target.value }))
            }
            placeholder={t.holidayName}
            className="max-w-72"
          />
          <Button type="submit" disabled={busy}>{t.addHoliday}</Button>
        </form>
        <ul className="mt-4 space-y-2">
          {holidays.map((item) => (
            <li
              key={item.holiday_date}
              className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
            >
              <span>{item.holiday_date} · {item.name}</span>
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => void deleteHoliday(item.holiday_date)}
              >
                {t.removeHoliday}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
