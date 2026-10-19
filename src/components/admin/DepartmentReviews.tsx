"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Select, Textarea } from "@/components/ui";
import { useDict, useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import {
  criteriaForDepartment,
  summarizeScores,
  type ScoreBand,
} from "@/lib/department-criteria";

export interface DepartmentReviewView {
  id: string;
  registration_id: string;
  department: string;
  request_reason: string | null;
  status: "REQUESTED" | "IN_REVIEW" | "INFO_REQUESTED" | "COMPLETED" | "CANCELLED";
  requested_at: string;
  sent_at: string | null;
  received_at: string | null;
  due_at: string | null;
  remaining_sla_seconds: number;
  paused_at: string | null;
  response_status: "APPROVED" | "OBSERVATIONS" | "REJECTED" | null;
  response_notes: string | null;
  scores: Record<string, number> | null;
  score_average: number | null;
  score_band: ScoreBand | null;
  responded_at: string | null;
  last_escalated_at: string | null;
  escalation_count: number;
  supplier_registrations: { company_name: string | null; reference_no: string | null };
  review_departments: { name: string };
}

const BAND_STYLES: Record<ScoreBand, string> = {
  POSITIVE: "bg-emerald-100 text-emerald-700",
  NEUTRAL: "bg-amber-100 text-amber-800",
  NEGATIVE: "bg-rose-100 text-rose-700",
};

type CriteriaLabels = {
  scoreTitle: string;
  scoreHint: string;
  scoreStrong: string;
  scoreWeak: string;
  bands: Record<ScoreBand, string>;
};

function CriteriaScoring({
  criteria,
  lang,
  labels,
  values,
  onChange,
}: {
  criteria: { id: string; es: string; en: string }[];
  lang: "es" | "en";
  labels: CriteriaLabels;
  values: Record<string, number>;
  onChange: (criterionId: string, value: number) => void;
}) {
  if (criteria.length === 0) return null;
  const summary = summarizeScores(null, values);
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-semibold text-slate-700">{labels.scoreTitle}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{labels.scoreHint}</p>
      <div className="mt-2 space-y-2">
        {criteria.map((criterion) => (
          <div
            key={criterion.id}
            className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600"
          >
            <span className="min-w-0 flex-1">
              {lang === "en" ? criterion.en : criterion.es}
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange(criterion.id, value)}
                  aria-pressed={values[criterion.id] === value}
                  className={`h-7 w-7 rounded-md border text-[11.5px] font-semibold transition-colors ${
                    values[criterion.id] === value
                      ? "border-navy-800 bg-navy-800 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-navy-300"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>{labels.scoreWeak}</span>
        <span>{labels.scoreStrong}</span>
      </div>
      {summary && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">
            {labels.scoreTitle}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${BAND_STYLES[summary.band]}`}
          >
            {labels.bands[summary.band]} · {summary.average}/5
          </span>
        </div>
      )}
    </div>
  );
}

export function DepartmentReviews({
  reviews,
  canSend,
  canAct,
  userDepartment,
  heading,
  queueHref,
}: {
  reviews: DepartmentReviewView[];
  canSend: boolean;
  canAct: boolean;
  userDepartment: string | null;
  heading?: string;
  queueHref?: string;
}) {
  const dict = useDict();
  const { lang } = useI18n();
  const t = dict.admin.departmentReviews;
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [responseStatuses, setResponseStatuses] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const act = async (review: DepartmentReviewView, action: string) => {
    setBusyId(review.id);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/department-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: review.id,
          action,
          notes: notes[review.id] ?? "",
          responseStatus: responseStatuses[review.id] ?? "",
          scores: scores[review.id] ?? null,
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setMessage(
          result?.error === "department_email_not_configured"
            ? t.emailNotConfigured
            : t.actionFailed
        );
        return;
      }
      setMessage(t.actionSaved);
      setNotes((current) => ({ ...current, [review.id]: "" }));
      router.refresh();
    } catch {
      setMessage(t.actionFailed);
    } finally {
      setBusyId(null);
    }
  };

  if (reviews.length === 0) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
        {t.empty}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {(heading || queueHref) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {heading && (
            <h1 className="font-display text-xl font-semibold tracking-tight text-navy-900">
              {heading}
            </h1>
          )}
          {queueHref && (
            <Link
              href={queueHref}
              className="text-xs font-semibold text-navy-800 underline underline-offset-2"
            >
              ← {t.title}
            </Link>
          )}
        </div>
      )}
      {message && (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {message}
        </p>
      )}
      {reviews.map((review) => {
        const canActOnReview =
          canAct &&
          (userDepartment === null || userDepartment === review.department);
        const isOverdue =
          review.status === "IN_REVIEW" &&
          Boolean(review.due_at) &&
          now !== null &&
          Date.parse(review.due_at ?? "") < now;
        const remainingDays = Math.ceil(review.remaining_sla_seconds / 86400);
        const company =
          review.supplier_registrations?.company_name ?? review.registration_id;
        return (
          <article
            key={review.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">
                  <Link
                    className="hover:text-navy-800 hover:underline"
                    href={`/admin/reviews/${review.id}`}
                  >
                    {company}
                  </Link>
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {review.supplier_registrations?.reference_no ?? "—"} ·{" "}
                  {review.review_departments?.name ?? review.department}
                </p>
                {review.request_reason && (
                  <p className="mt-2 text-sm text-slate-700">{review.request_reason}</p>
                )}
                <Link
                  className="mt-2 inline-block text-xs font-semibold text-navy-800 underline underline-offset-2"
                  href={`/admin/suppliers/${review.registration_id}/docs`}
                >
                  {t.openSupplierDocuments}
                </Link>
                <span className="mx-2 text-slate-300">·</span>
                <Link
                  className="mt-2 inline-block text-xs font-semibold text-navy-800 underline underline-offset-2"
                  href={`/admin/reviews/${review.id}`}
                >
                  {t.openCase}
                </Link>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isOverdue
                    ? "bg-rose-100 text-rose-700"
                    : review.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-800"
                }`}
              >
                {isOverdue ? t.overdue : t.statuses[review.status]}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-5">
              <div>
                <dt className="font-semibold">{t.sent}</dt>
                <dd>{review.sent_at ? formatDate(review.sent_at) : "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold">{t.received}</dt>
                <dd>{review.received_at ? formatDate(review.received_at) : "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold">{t.due}</dt>
                <dd>{review.due_at ? formatDate(review.due_at) : "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold">{t.remaining}</dt>
                <dd>
                  {review.status === "INFO_REQUESTED"
                    ? t.paused.replace("{days}", String(remainingDays))
                    : review.status === "IN_REVIEW"
                      ? `${remainingDays} ${t.businessDays}`
                      : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">{t.escalations}</dt>
                <dd>
                  {review.escalation_count > 0
                    ? `${review.escalation_count} · ${review.last_escalated_at ? formatDate(review.last_escalated_at) : "—"}`
                    : "—"}
                </dd>
              </div>
            </dl>
            {review.status === "COMPLETED" ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                  {t.response}: {review.response_status} — {review.response_notes}
                </div>
                {review.score_band && (
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">
                        {t.scoreTitle}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${BAND_STYLES[review.score_band]}`}
                      >
                        {t.bands[review.score_band]}
                        {review.score_average !== null
                          ? ` · ${review.score_average}/5`
                          : ""}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-slate-600">
                      {criteriaForDepartment(review.department).map((criterion) => {
                        const value = review.scores?.[criterion.id];
                        if (typeof value !== "number") return null;
                        return (
                          <li key={criterion.id} className="flex justify-between gap-3">
                            <span>{lang === "en" ? criterion.en : criterion.es}</span>
                            <span className="font-semibold tabular-nums">{value}/5</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ) : canActOnReview ? (
              <div className="mt-4 space-y-3">
                {(review.status === "INFO_REQUESTED" ||
                  review.status === "IN_REVIEW") && (
                  <Textarea
                    rows={2}
                    value={notes[review.id] ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({
                        ...current,
                        [review.id]: event.target.value,
                      }))
                    }
                    placeholder={
                      review.status === "INFO_REQUESTED"
                        ? t.informationRequest
                        : t.responseNotes
                    }
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  {review.status === "REQUESTED" && canSend && !review.sent_at && (
                    <Button
                      size="sm"
                      disabled={busyId === review.id}
                      onClick={() => void act(review, "SEND")}
                    >
                      {t.send}
                    </Button>
                  )}
                  {review.status === "REQUESTED" && review.sent_at && (
                    <Button
                      size="sm"
                      disabled={busyId === review.id}
                      onClick={() => void act(review, "RECEIVE")}
                    >
                      {t.confirmCompleteReceipt}
                    </Button>
                  )}
                  {review.status === "IN_REVIEW" && (
                    <>
                      <CriteriaScoring
                        criteria={criteriaForDepartment(review.department)}
                        lang={lang}
                        labels={t}
                        values={scores[review.id] ?? {}}
                        onChange={(criterionId, value) =>
                          setScores((current) => ({
                            ...current,
                            [review.id]: {
                              ...(current[review.id] ?? {}),
                              [criterionId]: value,
                            },
                          }))
                        }
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busyId === review.id || (notes[review.id] ?? "").trim().length < 10}
                        onClick={() => void act(review, "REQUEST_INFO")}
                      >
                        {t.requestInformation}
                      </Button>
                      <Select
                        className="max-w-52"
                        value={responseStatuses[review.id] ?? ""}
                        onChange={(event) =>
                          setResponseStatuses((current) => ({
                            ...current,
                            [review.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">{t.selectResponse}</option>
                        <option value="APPROVED">{t.responses.APPROVED}</option>
                        <option value="OBSERVATIONS">{t.responses.OBSERVATIONS}</option>
                        <option value="REJECTED">{t.responses.REJECTED}</option>
                      </Select>
                      <Button
                        size="sm"
                        disabled={
                          busyId === review.id ||
                          !(responseStatuses[review.id] ?? "") ||
                          (notes[review.id] ?? "").trim().length < 10
                        }
                        onClick={() => void act(review, "RESPOND")}
                      >
                        {t.submitResponse}
                      </Button>
                    </>
                  )}
                  {review.status === "INFO_REQUESTED" && (
                    <Button
                      size="sm"
                      disabled={busyId === review.id}
                      onClick={() => void act(review, "RESUME")}
                    >
                      {t.resume}
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
