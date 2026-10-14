export type SupplierStatus =
  | "SIN_INICIAR"
  | "BORRADOR"
  | "PENDIENTE"
  | "EN_REVISION"
  | "SOLICITUD_CAMBIOS"
  | "APROBADO"
  | "APROBADO_CONDICIONES"
  | "RECHAZADO";

export interface PortalStatusResult {
  found: boolean;
  reference_no?: string | null;
  company_name?: string | null;
  tax_id?: string | null;
  provider_type?: string | null;
  country?: string | null;
  status: SupplierStatus;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  can_edit?: boolean;
  invitation_token?: string | null;
  note?: string | null;
  documents_count?: number;
  error?: string;
  message?: string;
}
