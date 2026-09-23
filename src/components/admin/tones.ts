import type { RegistrationStatus, RiskLevel } from "@/lib/types";

export function statusTone(status: RegistrationStatus) {
  switch (status) {
    case "APROBADO":
      return "green" as const;
    case "APROBADO_CONDICIONES":
      return "teal" as const;
    case "PENDIENTE":
      return "amber" as const;
    case "EN_REVISION":
      return "blue" as const;
    case "SOLICITUD_CAMBIOS":
      return "navy" as const;
    case "RECHAZADO":
      return "red" as const;
    default:
      return "gray" as const;
  }
}

export function riskTone(risk: RiskLevel) {
  switch (risk) {
    case "ALTO":
      return "amber" as const;
    case "CRITICO":
      return "red" as const;
    case "BAJO":
      return "green" as const;
    case "MEDIO":
      return "gold" as const;
    default:
      return "gray" as const;
  }
}

/** i18n key (dot path under the dictionary) for a status label. */
export function statusLabelKey(status: RegistrationStatus): string {
  return `statuses.${status}`;
}

/** i18n key (dot path under the dictionary) for a risk label. */
export function riskLabelKey(risk: RiskLevel): string {
  return `risk.${risk}`;
}

export const ALL_STATUSES: RegistrationStatus[] = [
  "BORRADOR",
  "PENDIENTE",
  "EN_REVISION",
  "SOLICITUD_CAMBIOS",
  "APROBADO",
  "APROBADO_CONDICIONES",
  "RECHAZADO",
];

export const STATUS_COLORS: Record<RegistrationStatus, string> = {
  BORRADOR: "#94a3b8",
  PENDIENTE: "#f59e0b",
  EN_REVISION: "#0284c7",
  SOLICITUD_CAMBIOS: "#6366f1",
  APROBADO: "#10b981",
  APROBADO_CONDICIONES: "#0d9488",
  RECHAZADO: "#f43f5e",
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  PENDIENTE: "#94a3b8",
  BAJO: "#10b981",
  MEDIO: "#f59e0b",
  ALTO: "#f97316",
  CRITICO: "#ef4444",
};

export const ALL_RISKS: RiskLevel[] = [
  "PENDIENTE",
  "BAJO",
  "MEDIO",
  "ALTO",
  "CRITICO",
];

export const PROVIDER_TYPES = [
  "PERSONA_FISICA",
  "EMPLEADO",
  "EXTRANJERO",
  "NACIONAL",
  "NACIONAL_CREDITO",
  "NUEVO",
  "PROVEEDOR_REGISTRADO",
  "CRITICO",
  "PROVEEDOR_CONFIDENCIAL",
  "OTRO",
];

export const COUNTRIES = [
  "República Dominicana",
  "USA",
  "Canadá",
  "México",
  "Puerto Rico",
  "Colombia",
  "Panamá",
  "España",
  "China",
  "Otro",
];