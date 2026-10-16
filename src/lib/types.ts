export type Lang = "es" | "en";

export type RegistrationStatus =
  | "BORRADOR" // draft — in progress
  | "PENDIENTE" // submitted, awaiting review
  | "EN_REVISION" // being evaluated
  | "SOLICITUD_CAMBIOS" // clarifications requested
  | "APROBADO" // approved
  | "APROBADO_CONDICIONES" // approved with conditions
  | "RECHAZADO"; // rejected

export const APPROVED_REGISTRATION_STATUSES = [
  "APROBADO",
  "APROBADO_CONDICIONES",
] as const satisfies readonly RegistrationStatus[];

export function isRegistrationApproved(status: string | null | undefined): boolean {
  return APPROVED_REGISTRATION_STATUSES.some((approvedStatus) => approvedStatus === status);
}

export type RiskLevel = "PENDIENTE" | "BAJO" | "MEDIO" | "ALTO" | "CRITICO";

// ---------------------------------------------------------------------
// Form payload (sections 1-11) — lives in supplier_registrations.data
// ---------------------------------------------------------------------
export interface ContactRow {
  role: string;
  name: string;
  position: string;
  phone: string;
  email: string;
}

export interface ReferenceRow {
  client: string;
  contact: string;
  phoneEmail: string;
  product: string;
}

export interface ComplianceRow {
  id: number;
  answer: "" | "no" | "si";
  explanation: string;
}

export interface DocumentIntent {
  ref: string;
  checked: boolean;
  note: string;
}

/** Internal UI-only metadata persisted inside data (not part of any section). */
export interface UiMeta {
  lastStep?: number;
}

export interface SupplierData {
  /** Internal UI state (e.g. last wizard step) — not a form section. */
  _ui?: UiMeta;
  section1: {
    providerType: string;
    providerTypeOther: string;
    isContractor: "" | "no" | "si";
    legalName: string;
    commercialName: string;
    taxId: string;
    registryNo: string;
    registryExpiry: string;
    exporterCodeExpiry: string;
    foundedDate: string;
    nationality: string;
    legalAddress: string;
    provinceCountry: string;
    phoneEmail: string;
    website: string;
    mainEconomicActivity: string;
    goodsServices: string;
  };
  section2: {
    contacts: ContactRow[];
  };
  section3: {
    legalRepName: string;
    legalRepId: string;
    shareholders: string;
    pep: "" | "no" | "si";
    pepDetail: string;
    relatedToSbc: "" | "no" | "si";
    relatedToSbcDetail: string;
    relatedCompanies: string;
  };
  section4: {
    taxReceipts: string[];
    taxCondition: string;
    tss: string[];
    withholdings: string;
    specialRegime: string[];
    specialRegimeOther: string;
  };
  section5: {
    bank: string;
    accountHolder: string;
    accountHolderId: string;
    accountType: string[];
    currency: string;
    currencyOther: string;
    accountNumber: string;
    swift: string;
    paymentTerms: string[];
    creditDays: string;
    advancePct: string;
    offersCredit: "" | "no" | "si";
    creditCompanies: string[];
  };
  section6: {
    yearsExperience: string;
    coverage: string[];
    coverageDetail: string;
    supplyCapacity: string;
    avgDeliveryTime: string;
    warrantyPolicy: string;
    brands: string;
  };
  section7: {
    references: ReferenceRow[];
  };
  section8: {
    compliance: ComplianceRow[];
  };
  section9: {
    documents: DocumentIntent[];
  };
  section10: {
    authorizations: string[];
  };
  section11: {
    signerName: string;
    signerRole: string;
    signatureConsent: boolean;
    signedDate: string;
    signatureDataUrl: string;
  };
}

export function emptyData(): SupplierData {
  return {
    _ui: { lastStep: 0 },
    section1: {
      providerType: "",
      providerTypeOther: "",
      isContractor: "",
      legalName: "",
      commercialName: "",
      taxId: "",
      registryNo: "",
      registryExpiry: "",
      exporterCodeExpiry: "",
      foundedDate: "",
      nationality: "",
      legalAddress: "",
      provinceCountry: "",
      phoneEmail: "",
      website: "",
      mainEconomicActivity: "",
      goodsServices: "",
    },
    section2: { contacts: [{ role: "representante", name: "", position: "", phone: "", email: "" }] },
    section3: {
      legalRepName: "",
      legalRepId: "",
      shareholders: "",
      pep: "",
      pepDetail: "",
      relatedToSbc: "",
      relatedToSbcDetail: "",
      relatedCompanies: "",
    },
    section4: {
      taxReceipts: [],
      taxCondition: "",
      tss: [],
      withholdings: "",
      specialRegime: [],
      specialRegimeOther: "",
    },
    section5: {
      bank: "",
      accountHolder: "",
      accountHolderId: "",
      accountType: [],
      currency: "",
      currencyOther: "",
      accountNumber: "",
      swift: "",
      paymentTerms: [],
      creditDays: "",
      advancePct: "",
      offersCredit: "",
      creditCompanies: [],
    },
    section6: {
      yearsExperience: "",
      coverage: [],
      coverageDetail: "",
      supplyCapacity: "",
      avgDeliveryTime: "",
      warrantyPolicy: "",
      brands: "",
    },
    section7: { references: [{ client: "", contact: "", phoneEmail: "", product: "" }] },
    section8: {
      compliance: Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        answer: "",
        explanation: "",
      })),
    },
    section9: { documents: [] },
    section10: { authorizations: [] },
    section11: {
      signerName: "",
      signerRole: "",
      signatureConsent: false,
      signedDate: "",
      signatureDataUrl: "",
    },
  };
}

// ---------------------------------------------------------------------
// Evaluation (sections 12-13) — lives in supplier_registrations.evaluation
// ---------------------------------------------------------------------
export interface ValidationCheck {
  id: string; // rnc | mercantil | dgii | tss | bank | shareholder | pep | references | permits | conflicts
  result: string; // CONFORME | NO_CONFORME | FAVORABLE | NO_FAVORABLE | ALERTA | NO_IDENTIFICADO |
  // DECLARADO | ESCALADO | N/A
  date: string;
  notes: string;
}

export interface ReviewSignature {
  role: string;
  name: string;
  date: string;
}

/**
 * Specialized validations recorded by Purchasing (Compras owns the whole
 * process; other departments do not intervene). A trigger turns the matching
 * area into PENDIENTE, which Compras must then close.
 */
export type SpecializedStatus = "NO_APLICA" | "PENDIENTE" | "APROBADA" | "CON_OBSERVACIONES";
export type SpecializedKind = "finance" | "legal" | "technology";

export interface SpecializedValidation {
  status: SpecializedStatus;
  notes: string;
  date: string;
  by: string;
}

export type SpecializedMap = Record<SpecializedKind, SpecializedValidation>;

export interface SpecializedHistoryEntry {
  id: number;
  created_at: string;
  created_by_email: string | null;
  specialized: Partial<SpecializedMap> | null;
  evaluation: Evaluation | null;
}

export function emptySpecialized(): SpecializedValidation {
  return { status: "NO_APLICA", notes: "", date: "", by: "" };
}

export function emptySpecializedMap(): SpecializedMap {
  return { finance: emptySpecialized(), legal: emptySpecialized(), technology: emptySpecialized() };
}

export interface Evaluation {
  section12: {
    requestingCompany: string;
    requestingArea: string;
    purchaseCategory: string;
    estimatedAnnualAmount: string;
    risk: RiskLevel;
    reviewType: string; // INICIAL | ACTUALIZACION | EVENTO | CAMBIO_BANCARIO
    /** Per-category ratings: 1 = Bajo, 2 = Medio, 3 = Alto (0/absent = N/A). */
    riskCategories: Record<string, number>;
    /** Red flag / critical finding → forces ALTO. */
    redFlag: boolean;
    redFlagNotes: string;
    /** Risk computed from the categories by the engine (authoritative on save). */
    computedRisk: RiskLevel;
    /**
     * Specialized validations owned by Purchasing. Optional because legacy
     * evaluations were saved before this field existed.
     */
    specialized?: SpecializedMap;
    checks: ValidationCheck[];
  };
  section13: {
    decision: RegistrationStatus; // APROBADO | APROBADO_CONDICIONES | PENDIENTE | RECHAZADO ...
    conditions: string;
    purchaseLimits: string;
    nextRenewal: string;
    signatures: ReviewSignature[];
  };
}

export function emptyEvaluation(): Evaluation {
  const checkIds = [
    "rnc",
    "mercantil",
    "dgii",
    "tss",
    "bank",
    "shareholder",
    "pep",
    "references",
    "permits",
    "conflicts",
  ];
  return {
    section12: {
      requestingCompany: "",
      requestingArea: "",
      purchaseCategory: "",
      estimatedAnnualAmount: "",
      risk: "PENDIENTE",
      reviewType: "INICIAL",
      riskCategories: {},
      redFlag: false,
      redFlagNotes: "",
      computedRisk: "PENDIENTE",
      specialized: emptySpecializedMap(),
      checks: checkIds.map((id) => ({ id, result: "", date: "", notes: "" })),
    },
    section13: {
      decision: "PENDIENTE",
      conditions: "",
      purchaseLimits: "",
      nextRenewal: "",
      signatures: [],
    },
  };
}

// ---------------------------------------------------------------------
// Database rows
// ---------------------------------------------------------------------
export interface InvitationRow {
  id: string;
  token: string;
  supplier_email: string;
  supplier_name: string;
  note: string;
  status: "sent" | "in_progress" | "completed";
  language: Lang;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  last_opened_at: string | null;
}

export interface RegistrationRow {
  id: string;
  invitation_id: string | null;
  invitation_token: string;
  reference_no: string | null;
  status: RegistrationStatus;
  risk_level: RiskLevel;
  language: Lang;
  data: SupplierData;
  evaluation: Evaluation | null;
  tags: string[];
  company_name: string;
  commercial_name: string;
  provider_type: string;
  tax_id: string;
  country: string;
  province: string;
  primary_activity: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  registration_id: string;
  invitation_token: string;
  ref: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  url: string;
  created_at: string;
}

export interface AppConfigRow {
  key: string;
  value: string;
  updated_at: string;
}

/**
 * Compliance questions that trigger an automatic rejection when answered "si":
 * 1 fraud/corruption, 2 sanctions/debarment, 3 termination for breach,
 * 4 litigation/insolvency, 6 improper benefits.
 */
export const AUTO_REJECT_QUESTION_IDS = [1, 2, 3, 4, 6] as const;

/** Group companies selectable when a supplier extends credit. */
export const sbcGroupCompanies: string[] = [
  "Fideicomiso Ciudad del Sol",
  "Jose Sanchez Comercial",
  "Jose Sanchez Polanco",
  "Jose Sanchez Polanco Business Corp S.R.L.",
  "Kexford Company",
  "Suncity",
  "Sunrise Gardens",
  "Sunset Gardens",
  "TANDIKER INTERNATIONAL GROUP SRL",
  "UPLAND INVESTMENTS SRL",
];

export const DOCUMENT_REFS = "";

export const SUPPLY_CAPACITY_OPTIONS = [
  "Baja",
  "Media",
  "Alta",
  "Personalizada",
] as const;

export const DELIVERY_TIME_OPTIONS = [
  "24 horas",
  "48 horas",
  "Semanal",
  "Quincenal",
  "Mensual",
  "Trimestral",
  "Anual",
  "Otro",
] as const;

export const REQUESTING_AREAS: string[] = [
  "Consejo",
  "Tecnología",
  "Proyecto",
  "Jose Sanchez Comercial",
  "Talento y Cultura",
  "Administración",
  "Compras",
  "Legales",
  "Finanzas",
  "Conserjería",
];

/** How strictly a document is required per the due-diligence policy. */
export type DocumentRequirement = "required" | "optional" | "contractor";

export const documentCatalog: {
  ref: string;
  appliesTo: string;
  requirement: DocumentRequirement;
}[] = [
  { ref: "A", appliesTo: "todos", requirement: "required" },
  { ref: "B", appliesTo: "todos", requirement: "required" },
  { ref: "C", appliesTo: "nacionales", requirement: "required" },
  { ref: "D", appliesTo: "juridica", requirement: "required" },
  { ref: "E", appliesTo: "juridica", requirement: "required" },
  { ref: "F", appliesTo: "juridica", requirement: "required" },
  { ref: "G", appliesTo: "segun_politica", requirement: "required" },
  { ref: "H", appliesTo: "segun_aplique", requirement: "optional" },
  { ref: "I", appliesTo: "pagos", requirement: "required" },
  { ref: "J", appliesTo: "todos", requirement: "required" },
  { ref: "K", appliesTo: "segun_monto", requirement: "required" },
  { ref: "L", appliesTo: "regulada", requirement: "optional" },
  { ref: "M", appliesTo: "contratista", requirement: "contractor" },
  { ref: "N", appliesTo: "solo_rpe", requirement: "optional" },
  { ref: "O", appliesTo: "extranjero", requirement: "required" },
  { ref: "P", appliesTo: "segun_politica", requirement: "optional" },
];

/** Whether a catalog item applies to a given supplier profile. */
export function documentApplies(
  appliesTo: string,
  profile: { providerType?: string; nationality?: string; isContractor?: string }
): boolean {
  const nat = (profile.nationality ?? "").trim();
  const foreign =
    nat !== "" &&
    nat.toUpperCase() !== "DO" &&
    !/rep[úu]blica dominicana|dominican republic/i.test(nat);
  switch (appliesTo) {
    case "juridica":
      return profile.providerType === "juridica";
    case "contratista":
      return profile.isContractor === "si";
    case "extranjero":
      return foreign;
    case "nacionales":
      return !foreign;
    default:
      return true;
  }
}

/**
 * Documents the supplier must check (and upload) before submitting: required
 * items that apply to their profile. Contractor insurance policies are only
 * mandatory for contractors.
 */
export function requiredDocumentRefs(profile: {
  providerType?: string;
  nationality?: string;
  isContractor?: string;
}): string[] {
  return documentCatalog
    .filter((d) => d.requirement !== "optional" && documentApplies(d.appliesTo, profile))
    .map((d) => d.ref);
}

export const registrationStatusLabels: Record<RegistrationStatus, string> = {
  BORRADOR: "Borrador",
  PENDIENTE: "Pendiente",
  EN_REVISION: "En revisión",
  SOLICITUD_CAMBIOS: "Solicitud de cambios",
  APROBADO: "Aprobado",
  APROBADO_CONDICIONES: "Aprobado con condiciones",
  RECHAZADO: "Rechazado",
};

export const riskLevelLabels: Record<RiskLevel, string> = {
  PENDIENTE: "Sin clasificar",
  BAJO: "Bajo",
  MEDIO: "Medio",
  ALTO: "Alto",
  CRITICO: "Crítico",
};