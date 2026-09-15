export type Lang = "es" | "en";

export type RegistrationStatus =
  | "BORRADOR" // draft — in progress
  | "PENDIENTE" // submitted, awaiting review
  | "EN_REVISION" // being evaluated
  | "SOLICITUD_CAMBIOS" // clarifications requested
  | "APROBADO" // approved
  | "APROBADO_CONDICIONES" // approved with conditions
  | "RECHAZADO"; // rejected

export type RiskLevel = "PENDIENTE" | "BAJO" | "MEDIO" | "ALTO" | "CRITICO";

// ---------------------------------------------------------------------
// Form payload (sections 1-11) — lives in supplier_registrations.data
// ---------------------------------------------------------------------
export interface ContactRow {
  role: string;
  name: string;
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

export interface SupplierData {
  section1: {
    providerType: string;
    providerTypeOther: string;
    legalName: string;
    commercialName: string;
    taxId: string;
    registryNo: string;
    registryExpiry: string;
    foundedDate: string;
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
    section1: {
      providerType: "",
      providerTypeOther: "",
      legalName: "",
      commercialName: "",
      taxId: "",
      registryNo: "",
      registryExpiry: "",
      foundedDate: "",
      legalAddress: "",
      provinceCountry: "",
      phoneEmail: "",
      website: "",
      mainEconomicActivity: "",
      goodsServices: "",
    },
    section2: { contacts: [{ role: "representante", name: "", phone: "", email: "" }] },
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

export interface Evaluation {
  section12: {
    requestingCompany: string;
    requestingArea: string;
    purchaseCategory: string;
    estimatedAnnualAmount: string;
    risk: RiskLevel;
    reviewType: string; // INICIAL | ACTUALIZACION | EVENTO | CAMBIO_BANCARIO
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
      checks: checkIds.map((id) => ({ id, result: "N/A", date: "", notes: "" })),
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

export const DOCUMENT_REFS = "";

export const documentCatalog: { ref: string; appliesTo: string }[] = [
  { ref: "A", appliesTo: "todos" },
  { ref: "B", appliesTo: "todos" },
  { ref: "C", appliesTo: "nacionales" },
  { ref: "D", appliesTo: "juridica" },
  { ref: "E", appliesTo: "juridica" },
  { ref: "F", appliesTo: "juridica" },
  { ref: "G", appliesTo: "segun_politica" },
  { ref: "H", appliesTo: "segun_aplique" },
  { ref: "I", appliesTo: "pagos" },
  { ref: "J", appliesTo: "todos" },
  { ref: "K", appliesTo: "segun_monto" },
  { ref: "L", appliesTo: "regulada" },
  { ref: "M", appliesTo: "obras" },
  { ref: "N", appliesTo: "solo_rpe" },
  { ref: "O", appliesTo: "extranjero" },
  { ref: "P", appliesTo: "segun_politica" },
];

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