export type ScoreBand = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export interface DepartmentCriterion {
  id: string;
  /** es / en labels live in the i18n dictionaries; these are the fixed ids. */
  es: string;
  en: string;
  /** Optional weight inside the department average (defaults to 1). */
  weight?: number;
}

export const SCORE_MIN = 1;
export const SCORE_MAX = 5;

/** Fixed criteria per review department. Keyed by review_departments.id. */
export const DEPARTMENT_CRITERIA: Record<string, DepartmentCriterion[]> = {
  FINANCE: [
    {
      id: "financial_stability",
      es: "Estabilidad financiera y solvencia",
      en: "Financial stability and solvency",
      weight: 1.5,
    },
    {
      id: "credit_history",
      es: "Historial crediticio y referencias bancarias",
      en: "Credit history and bank references",
      weight: 1.5,
    },
    {
      id: "tax_compliance",
      es: "Cumplimiento fiscal y de obligaciones tributarias",
      en: "Tax and statutory obligation compliance",
    },
    {
      id: "payment_terms",
      es: "Condiciones y comportamiento de pago",
      en: "Payment terms and track record",
    },
    {
      id: "insurance_coverage",
      es: "Cobertura de seguros y garantías",
      en: "Insurance coverage and guarantees",
    },
  ],
  LEGAL: [
    {
      id: "legal_representative",
      es: "Existe y representa legalmente a la empresa",
      en: "Legal representative exists and has authority",
      weight: 1.5,
    },
    {
      id: "corporate_documents",
      es: "Documentos corporativos vigentes y consistentes",
      en: "Corporate documents are current and consistent",
    },
    {
      id: "sanctions_screening",
      es: "Sin sanciones, listas restrictivas ni PEP",
      en: "No sanctions, restricted lists or PEP findings",
      weight: 1.5,
    },
    {
      id: "litigation_risk",
      es: "Litigios o contingencias legales materiales",
      en: "Material litigation or legal contingencies",
    },
    {
      id: "compliance_program",
      es: "Programa de cumplimiento y anticorrupción",
      en: "Compliance and anti-corruption program",
    },
  ],
  TECHNOLOGY: [
    {
      id: "data_protection",
      es: "Protección de datos y privacidad",
      en: "Data protection and privacy",
      weight: 1.5,
    },
    {
      id: "security_controls",
      es: "Controles de seguridad de la información",
      en: "Information security controls",
      weight: 1.5,
    },
    {
      id: "integration_fit",
      es: "Compatibilidad e integración técnica",
      en: "Technical compatibility and integration",
    },
    {
      id: "service_continuity",
      es: "Continuidad y disponibilidad del servicio",
      en: "Service continuity and availability",
    },
    {
      id: "support_model",
      es: "Modelo de soporte y mantenimiento",
      en: "Support and maintenance model",
    },
  ],
  TECHNICAL: [
    {
      id: "product_quality",
      es: "Calidad del producto o servicio",
      en: "Product or service quality",
      weight: 1.5,
    },
    {
      id: "capacity",
      es: "Capacidad de producción o entrega",
      en: "Production or delivery capacity",
      weight: 1.5,
    },
    {
      id: "specifications",
      es: "Cumplimiento de especificaciones técnicas",
      en: "Compliance with technical specifications",
    },
    {
      id: "certifications",
      es: "Certificaciones y normas aplicables",
      en: "Applicable certifications and standards",
    },
    {
      id: "lead_times",
      es: "Tiempos de entrega y logística",
      en: "Lead times and logistics",
    },
  ],
};

export function criteriaForDepartment(
  department: string | null | undefined
): DepartmentCriterion[] {
  if (!department) return [];
  return DEPARTMENT_CRITERIA[department.toUpperCase()] ?? [];
}

export function isValidScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= SCORE_MIN &&
    value <= SCORE_MAX
  );
}

export interface ScoreSummary {
  average: number;
  band: ScoreBand;
}

/**
 * Weighted average of the criteria present in `scores` and its band.
 * Bands: >= 4 POSITIVE (good), >= 3 NEUTRAL, otherwise NEGATIVE (low).
 * Returns null when there is nothing valid to average.
 */
export function summarizeScores(
  department: string | null | undefined,
  scores: Record<string, unknown> | null | undefined
): ScoreSummary | null {
  const criteria = criteriaForDepartment(department);
  const source = scores ?? {};
  let weighted = 0;
  let totalWeight = 0;

  const ids = criteria.length > 0 ? criteria.map((c) => c.id) : Object.keys(source);
  for (const id of ids) {
    const value = source[id];
    if (!isValidScore(value)) continue;
    const weight =
      criteria.find((criterion) => criterion.id === id)?.weight ?? 1;
    weighted += value * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  const average = Math.round((weighted / totalWeight) * 100) / 100;
  return { average, band: bandForAverage(average) };
}

export function bandForAverage(average: number): ScoreBand {
  if (average >= 4) return "POSITIVE";
  if (average >= 3) return "NEUTRAL";
  return "NEGATIVE";
}
