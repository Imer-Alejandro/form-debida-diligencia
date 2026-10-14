import type { SpecializedKind, SpecializedMap } from "@/lib/types";
import type { RiskTriggers } from "@/lib/risk";

// ---------------------------------------------------------------------------
// Specialized validations (owned by Purchasing)
// ---------------------------------------------------------------------------

const SPEC_ORDER: SpecializedKind[] = ["finance", "legal", "technology"];

export const SPECIALIZED_KINDS = SPEC_ORDER;

/**
 * Ensures every area whose trigger fired is at least PENDIENTE, so Purchasing
 * cannot leave a required validation marked as "not applicable". Areas without
 * a trigger keep whatever the user chose.
 */
export function specializedForTriggers(
  triggers: Pick<RiskTriggers, "finance" | "legal" | "technology">,
  current?: Partial<SpecializedMap>
): SpecializedMap {
  const result = {} as SpecializedMap;
  for (const kind of SPEC_ORDER) {
    const value = current?.[kind] ?? { status: "NO_APLICA", notes: "", date: "", by: "" };
    const triggered = triggers[kind];
    result[kind] =
      triggered && value.status === "NO_APLICA"
        ? { ...value, status: "PENDIENTE" as const }
        : { ...value };
  }
  return result;
}

export function isSpecializationComplete(specialized?: Partial<SpecializedMap>, triggers?: Pick<RiskTriggers, "finance" | "legal" | "technology">): boolean {
  if (!triggers) return true;
  return SPEC_ORDER.every((kind) => {
    if (!triggers[kind]) return true;
    const status = specialized?.[kind]?.status;
    return status === "APROBADA" || status === "CON_OBSERVACIONES";
  });
}

// ---------------------------------------------------------------------------
// Internal access links (requesting area, no login)
// ---------------------------------------------------------------------------

export type InternalKind = "FIRST_PURCHASE" | "INCIDENT";

export const INTERNAL_KINDS: InternalKind[] = ["FIRST_PURCHASE", "INCIDENT"];

export type InternalTokenStatus = "PENDIENTE" | "USADO" | "EXPIRADO";

export function normalizeInternalKind(value: unknown): InternalKind | null {
  return INTERNAL_KINDS.includes(value as InternalKind) ? (value as InternalKind) : null;
}

export function isTokenExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return false;
  return ts <= now;
}

/** Effective status of a link: already used, expired, or still pending. */
export function resolveInternalTokenStatus(
  row: { used_at?: string | null; expires_at?: string | null },
  now = Date.now()
): InternalTokenStatus {
  if (row.used_at) return "USADO";
  if (isTokenExpired(row.expires_at, now)) return "EXPIRADO";
  return "PENDIENTE";
}

export function internalLinkPath(token: string): string {
  return `/interno/${encodeURIComponent(token)}`;
}

// ---------------------------------------------------------------------------
// First purchase / service evaluation form
// ---------------------------------------------------------------------------

export type ServiceRecommendation = "SEGUIR" | "MEJORAR" | "CAMBIAR";
export const SERVICE_RECOMMENDATIONS: ServiceRecommendation[] = ["SEGUIR", "MEJORAR", "CAMBIAR"];

export const SERVICE_RATING_FIELDS = ["quality", "delivery", "price", "compliance", "service"] as const;
export type ServiceRatingField = (typeof SERVICE_RATING_FIELDS)[number];

export interface ServiceFormInput {
  area?: string;
  purchaseDate?: string;
  category?: string;
  quality?: number;
  delivery?: number;
  price?: number;
  compliance?: number;
  service?: number;
  comments?: string;
  recommendation?: string;
}

export interface ServiceFormResult {
  ok: boolean;
  errors: Record<string, string>;
  normalized: {
    area: string;
    purchase_date: string | null;
    category: string;
    quality: number;
    delivery: number;
    price: number;
    compliance: number;
    service: number;
    comments: string;
    recommendation: ServiceRecommendation;
  } | null;
}

function clampRating(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  if (r < 1 || r > 5) return null;
  return r;
}

export function validateServiceForm(input: ServiceFormInput): ServiceFormResult {
  const errors: Record<string, string> = {};

  const area = (input.area ?? "").trim();
  if (!area) errors.area = "required";

  const ratings: Record<ServiceRatingField, number> = {
    quality: 0,
    delivery: 0,
    price: 0,
    compliance: 0,
    service: 0,
  };
  for (const field of SERVICE_RATING_FIELDS) {
    const value = clampRating(input[field]);
    if (value === null) errors[field] = "invalid_rating";
    else ratings[field] = value;
  }

  const recommendation = (input.recommendation ?? "").trim().toUpperCase();
  if (!SERVICE_RECOMMENDATIONS.includes(recommendation as ServiceRecommendation)) {
    errors.recommendation = "invalid";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors, normalized: null };

  const purchaseDate = (input.purchaseDate ?? "").trim();
  return {
    ok: true,
    errors,
    normalized: {
      area,
      purchase_date: purchaseDate || null,
      category: (input.category ?? "").trim(),
      quality: ratings.quality,
      delivery: ratings.delivery,
      price: ratings.price,
      compliance: ratings.compliance,
      service: ratings.service,
      comments: (input.comments ?? "").trim(),
      recommendation: recommendation as ServiceRecommendation,
    },
  };
}

// ---------------------------------------------------------------------------
// Supplier incident report + follow-up state machine
// ---------------------------------------------------------------------------

export type IncidentStatus = "ABIERTA" | "EN_SEGUIMIENTO" | "CORRECCION_SOLICITADA" | "RESUELTA" | "CERRADA";
export const INCIDENT_STATUSES: IncidentStatus[] = [
  "ABIERTA",
  "EN_SEGUIMIENTO",
  "CORRECCION_SOLICITADA",
  "RESUELTA",
  "CERRADA",
];

export type IncidentAction = "NINGUNO" | "CORREGIR" | "SUSPENDER" | "DESHOMOLOGAR";
export const INCIDENT_ACTIONS: IncidentAction[] = ["NINGUNO", "CORREGIR", "SUSPENDER", "DESHOMOLOGAR"];

export type IncidentSeverity = "BAJA" | "MEDIA" | "ALTA";
export const INCIDENT_SEVERITIES: IncidentSeverity[] = ["BAJA", "MEDIA", "ALTA"];

const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  ABIERTA: ["EN_SEGUIMIENTO", "RESUELTA", "CERRADA"],
  EN_SEGUIMIENTO: ["CORRECCION_SOLICITADA", "RESUELTA", "CERRADA"],
  CORRECCION_SOLICITADA: ["EN_SEGUIMIENTO", "RESUELTA", "CERRADA"],
  RESUELTA: ["EN_SEGUIMIENTO", "CERRADA"],
  CERRADA: [],
};

export function normalizeIncidentStatus(value: unknown): IncidentStatus {
  return INCIDENT_STATUSES.includes(value as IncidentStatus) ? (value as IncidentStatus) : "ABIERTA";
}

export function normalizeIncidentAction(value: unknown): IncidentAction {
  return INCIDENT_ACTIONS.includes(value as IncidentAction) ? (value as IncidentAction) : "NINGUNO";
}

export function normalizeIncidentSeverity(value: unknown): IncidentSeverity {
  return INCIDENT_SEVERITIES.includes(value as IncidentSeverity) ? (value as IncidentSeverity) : "MEDIA";
}

/** Closed incidents are terminal; everything else follows the allowed map. */
export function canTransitionIncident(from: IncidentStatus, to: IncidentStatus): boolean {
  return INCIDENT_TRANSITIONS[from].includes(to);
}

export function allowedIncidentTransitions(from: IncidentStatus): IncidentStatus[] {
  return INCIDENT_TRANSITIONS[from];
}

export interface IncidentFormInput {
  area?: string;
  incidentDate?: string;
  kind?: string;
  description?: string;
  impact?: string;
  severity?: string;
  reportedBy?: string;
  contact?: string;
}

export interface IncidentFormResult {
  ok: boolean;
  errors: Record<string, string>;
  normalized: {
    area: string;
    incident_date: string | null;
    kind: string;
    description: string;
    impact: string;
    severity: IncidentSeverity;
    reported_by: string;
    contact: string;
  } | null;
}

export function validateIncidentForm(input: IncidentFormInput): IncidentFormResult {
  const errors: Record<string, string> = {};

  const area = (input.area ?? "").trim();
  if (!area) errors.area = "required";

  const description = (input.description ?? "").trim();
  if (!description) errors.description = "required";

  const incidentDate = (input.incidentDate ?? "").trim();
  if (!incidentDate) errors.incidentDate = "required";

  if (Object.keys(errors).length > 0) return { ok: false, errors, normalized: null };

  return {
    ok: true,
    errors,
    normalized: {
      area,
      incident_date: incidentDate,
      kind: (input.kind ?? "").trim(),
      description,
      impact: (input.impact ?? "").trim(),
      severity: normalizeIncidentSeverity(input.severity),
      reported_by: (input.reportedBy ?? "").trim(),
      contact: (input.contact ?? "").trim(),
    },
  };
}

export interface IncidentFollowUpInput {
  status?: string;
  recommendedAction?: string;
  resolutionNotes?: string;
}

export interface IncidentFollowUpResult {
  ok: boolean;
  errors: Record<string, string>;
  normalized: {
    status: IncidentStatus;
    recommended_action: IncidentAction;
    resolution_notes: string;
  } | null;
}

/** Validates a Purchasing follow-up: status must be reachable from the current one. */
export function validateIncidentFollowUp(
  currentStatus: IncidentStatus,
  input: IncidentFollowUpInput
): IncidentFollowUpResult {
  const errors: Record<string, string> = {};

  const target = input.status ? normalizeIncidentStatus(input.status) : currentStatus;
  if (target !== currentStatus && !canTransitionIncident(currentStatus, target)) {
    errors.status = "invalid_transition";
  }

  const recommendedAction = normalizeIncidentAction(input.recommendedAction);
  const notes = (input.resolutionNotes ?? "").trim();
  if (target === "RESUELTA" && recommendedAction === "NINGUNO" && !notes) {
    errors.resolutionNotes = "required";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors, normalized: null };

  return {
    ok: true,
    errors,
    normalized: {
      status: target,
      recommended_action: recommendedAction,
      resolution_notes: notes,
    },
  };
}
