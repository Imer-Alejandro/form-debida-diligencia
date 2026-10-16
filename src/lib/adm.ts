import {
  APPROVED_REGISTRATION_STATUSES,
  isRegistrationApproved,
  type SupplierData,
} from "./types";

export const ADM_DEFAULT_BASE_URL = "https://api.admcloud.net/api";

export interface AdmConfig {
  baseUrl: string;
  company: string;
  role: string;
  appid: string;
  username: string;
  password: string;
  token?: string;
}

export interface AdmVendor {
  ID?: string;
  Id?: string;
  id?: string;
  Name?: string;
  TaxID?: string;
  FiscalID?: string;
  Inactive?: boolean;
  Contacts?: Record<string, unknown>[];
  Addresses?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface AdmDeactivateResult {
  ok: boolean;
  reason?: "not_found";
  vendor?: AdmVendor;
}

export type AdmFetch = typeof fetch;

export type AdmEnv = Record<string, string | undefined>;

const TAX_ID_KEYS = [
  "TaxID",
  "FiscalID",
  "TaxId",
  "taxId",
  "TaxNumber",
  "TaxNumberID",
  "RNC",
  "Rnc",
  "rnc",
];
const LIST_KEYS = ["data", "Data", "value", "Value", "items", "Items", "result", "Result"];

function trim(value: string | undefined): string {
  return (value ?? "").trim();
}

export function readAdmConfig(env: AdmEnv = process.env): AdmConfig | null {
  const company = trim(env.ADM_COMPANY);
  const role = trim(env.ADM_ROLE);
  const appid = trim(env.ADM_APPID);
  const token = trim(env.ADM_TOKEN);
  const username = trim(env.ADM_USERNAME);
  const password = trim(env.ADM_PASSWORD);

  const hasAuth = Boolean(token) || (Boolean(username) && Boolean(password));
  if (!company || !role || !appid || !hasAuth) return null;

  const baseUrl = (trim(env.ADM_BASE_URL) || ADM_DEFAULT_BASE_URL).replace(/\/+$/, "");

  return {
    baseUrl,
    company,
    role,
    appid,
    username,
    password,
    token: token || undefined,
  };
}

export function isAdmConfigured(env: AdmEnv = process.env): boolean {
  return readAdmConfig(env) !== null;
}

/** Normalizes a tax id (RNC) so "1-31-12345-6" and "131123456" compare equal. */
export function normalizeTaxId(value: string | null | undefined): string {
  return String(value ?? "").replace(/[^0-9a-z]/gi, "").toLowerCase();
}

export function getVendorTaxId(vendor: AdmVendor): string {
  for (const key of TAX_ID_KEYS) {
    const value = vendor[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function getVendorId(vendor: AdmVendor): string {
  for (const key of ["ID", "Id", "id"]) {
    const value = vendor[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function extractAdmVendors(payload: unknown): AdmVendor[] {
  if (Array.isArray(payload)) return payload as AdmVendor[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of LIST_KEYS) {
      const value = record[key];
      if (Array.isArray(value)) return value as AdmVendor[];
      if (
        value &&
        typeof value === "object" &&
        ("ID" in value || "Id" in value || "FiscalID" in value || "TaxID" in value)
      ) {
        return [value as AdmVendor];
      }
    }
  }
  return [];
}

export function findAdmVendorByTaxId(vendors: AdmVendor[], taxId: string): AdmVendor | null {
  const target = normalizeTaxId(taxId);
  if (!target) return null;
  return vendors.find((vendor) => normalizeTaxId(getVendorTaxId(vendor)) === target) ?? null;
}

export function buildVendorInactivePayload(vendor: AdmVendor, inactive = true): AdmVendor {
  return { ...vendor, Inactive: inactive };
}

export function buildAdmQuery(config: AdmConfig, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({
    company: config.company,
    role: config.role,
    appid: config.appid,
    ...extra,
  });
  if (config.token) params.set("token", config.token);
  return params.toString();
}

export function admAuthHeaders(config: AdmConfig): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (!config.token) {
    const basic = Buffer.from(`${config.username}:${config.password}`, "utf8").toString("base64");
    headers.Authorization = `Basic ${basic}`;
  }
  return headers;
}

export async function fetchAdmVendors(
  config: AdmConfig,
  fetchImpl: AdmFetch = fetch
): Promise<AdmVendor[]> {
  const query = buildAdmQuery(config, { skip: "0" });
  const res = await fetchImpl(`${config.baseUrl}/Vendors?${query}`, {
    method: "GET",
    headers: admAuthHeaders(config),
  });
  if (!res.ok) throw new Error(`adm_vendors_${res.status}`);
  return extractAdmVendors(await res.json());
}

export async function fetchAdmVendorById(
  config: AdmConfig,
  id: string,
  fetchImpl: AdmFetch = fetch
): Promise<AdmVendor> {
  const query = buildAdmQuery(config);
  const res = await fetchImpl(
    `${config.baseUrl}/Vendors/${encodeURIComponent(id)}?${query}`,
    {
      method: "GET",
      headers: admAuthHeaders(config),
    }
  );
  if (!res.ok) throw new Error(`adm_vendor_${res.status}`);
  const [vendor] = extractAdmVendors(await res.json());
  if (!vendor) throw new Error("adm_vendor_invalid_response");
  return vendor;
}

export async function deactivateAdmVendor(
  config: AdmConfig,
  vendor: AdmVendor,
  fetchImpl: AdmFetch = fetch
): Promise<void> {
  const query = buildAdmQuery(config);
  const res = await fetchImpl(`${config.baseUrl}/Vendors?${query}`, {
    method: "PUT",
    headers: { ...admAuthHeaders(config), "Content-Type": "application/json" },
    body: JSON.stringify(buildVendorInactivePayload(vendor)),
  });
  if (!res.ok) throw new Error(`adm_vendor_update_${res.status}`);
}

export async function deactivateVendorByTaxId(
  config: AdmConfig,
  taxId: string,
  fetchImpl: AdmFetch = fetch
): Promise<AdmDeactivateResult> {
  const vendors = await fetchAdmVendors(config, fetchImpl);
  const vendor = findAdmVendorByTaxId(vendors, taxId);
  if (!vendor) return { ok: false, reason: "not_found" };
  const id = getVendorId(vendor);
  if (!id) throw new Error("adm_vendor_missing_id");
  const details = await fetchAdmVendorById(config, id, fetchImpl);
  await deactivateAdmVendor(config, details, fetchImpl);
  return { ok: true, vendor: details };
}

export const ADM_FINAL_DECISIONS: string[] = [...APPROVED_REGISTRATION_STATUSES, "RECHAZADO"];

export type AdmSyncAction =
  | "created"
  | "updated"
  | "deactivated"
  | "rejected_not_in_adm"
  | "skipped_decision"
  | "skipped_not_configured"
  | "skipped_no_tax_id"
  | "skipped_no_name"
  | "skipped_no_data";

export interface AdmSyncResult {
  ok: boolean;
  action?: AdmSyncAction;
  error?: string;
}

export function buildVendorPayload(data: SupplierData): AdmVendor {
  const s1 = data.section1;
  const contacts = (data.section2?.contacts ?? [])
    .map((contact) => {
      const row: Record<string, unknown> = {};
      const name = trim(contact.name);
      const position = trim(contact.position);
      const phone = trim(contact.phone);
      const email = trim(contact.email);
      if (!name && !position && !phone && !email) return row;

      if (name) {
        const [firstName, ...lastName] = name.split(/\s+/);
        row.FirstName = firstName;
        if (lastName.length > 0) row.LastName = lastName.join(" ");
        row.ShortName = name;
      }
      if (position) row.Position = position;
      if (trim(contact.role)) row.Department = trim(contact.role);
      if (phone) row.Phone1 = phone;
      if (email) row.EMail = email;
      return row;
    })
    .filter((contact) => Object.keys(contact).length > 0);
  const emails = contacts
    .map((contact) => contact.EMail)
    .filter((email): email is string => typeof email === "string");
  const phones = contacts
    .map((contact) => contact.Phone1)
    .filter((phone): phone is string => typeof phone === "string");
  const address: Record<string, unknown> = {};
  if (trim(s1.legalAddress)) address.Address1 = trim(s1.legalAddress);
  if (trim(s1.provinceCountry)) address.State = trim(s1.provinceCountry);
  const payload: AdmVendor = {
    Name: trim(s1.legalName),
    IsVendor: true,
    Inactive: false,
  };
  if (trim(s1.commercialName)) payload.ComercialName = trim(s1.commercialName);
  if (trim(s1.taxId)) payload.FiscalID = trim(s1.taxId);
  if (emails[0]) payload.EMail = emails[0];
  if (phones[0]) payload.Phone1 = phones[0];
  if (phones[1]) payload.Phone2 = phones[1];
  if (trim(s1.website)) payload.WebPage = trim(s1.website);
  if (trim(s1.mainEconomicActivity)) payload.BusinessActivity = trim(s1.mainEconomicActivity);
  if (trim(s1.goodsServices)) payload.Profile = trim(s1.goodsServices);
  if (data.section3.relatedToSbc === "si" || data.section3.relatedToSbc === "no") {
    payload.IsRelated = data.section3.relatedToSbc === "si";
  }
  if (data.section5.currency === "DOP" || data.section5.currency === "USD" || data.section5.currency === "EUR") {
    payload.CurrencyID = data.section5.currency;
    payload.BankAccountCurrencyID = data.section5.currency;
  }
  if (trim(data.section5.accountNumber)) {
    payload.BankAccountNumber = trim(data.section5.accountNumber);
  }
  if (contacts.length > 0) payload.Contacts = contacts;
  if (Object.keys(address).length > 0) payload.Addresses = [address];

  const notes = [
    ["Tipo de proveedor", s1.providerType === "otro" ? s1.providerTypeOther : s1.providerType],
    ["Contratista", s1.isContractor],
    ["Fecha de constitución / inicio", s1.foundedDate],
    ["País de nacionalidad", s1.nationality],
    ["Registro mercantil / código de exportador", s1.registryNo],
    ["Vencimiento del registro mercantil", s1.registryExpiry],
    ["Vencimiento del código de exportador", s1.exporterCodeExpiry],
    ["Teléfono / correo general", s1.phoneEmail],
    ["Representante legal", data.section3.legalRepName],
    ["Identificación del representante legal", data.section3.legalRepId],
    ["Accionistas / socios", data.section3.shareholders],
    ["Declaración PEP", data.section3.pep],
    ["Detalle PEP", data.section3.pepDetail],
    ["Relación con Sánchez Business & Corp.", data.section3.relatedToSbc],
    ["Detalle de relación", data.section3.relatedToSbcDetail],
    ["Empresas vinculadas", data.section3.relatedCompanies],
    ["Régimen fiscal especial", data.section4.specialRegime.join(", ")],
    ["Otro régimen fiscal", data.section4.specialRegimeOther],
    ["Titular de cuenta bancaria", data.section5.accountHolder],
    ["RNC / cédula del titular", data.section5.accountHolderId],
    ["Banco", data.section5.bank],
    ["Tipo de cuenta", data.section5.accountType.join(", ")],
    ["SWIFT / ABA / IBAN", data.section5.swift],
    ["Condiciones de pago", data.section5.paymentTerms.join(", ")],
    ["Días de crédito", data.section5.creditDays],
    ["Porcentaje de anticipo", data.section5.advancePct],
    ["Ofrece crédito a Sánchez Business & Corp.", data.section5.offersCredit],
    ["Empresas con crédito", data.section5.creditCompanies.join(", ")],
    ["Condición fiscal", data.section4.taxCondition],
    ["Comprobantes fiscales", data.section4.taxReceipts.join(", ")],
    ["TSS", data.section4.tss.join(", ")],
    ["Retenciones", data.section4.withholdings],
    ["Régimen especial", data.section4.specialRegime.join(", ")],
    ["Experiencia (años)", data.section6.yearsExperience],
    ["Cobertura", [...data.section6.coverage, data.section6.coverageDetail].filter(Boolean).join(": ")],
    ["Capacidad de suministro", data.section6.supplyCapacity],
    ["Tiempo de entrega", data.section6.avgDeliveryTime],
    ["Garantía", data.section6.warrantyPolicy],
    ["Marcas", data.section6.brands],
    [
      "Referencias comerciales",
      data.section7.references
        .map((reference) =>
          [reference.client, reference.contact, reference.phoneEmail, reference.product]
            .map(trim)
            .filter(Boolean)
            .join(" · ")
        )
        .filter(Boolean)
        .join("; "),
    ],
    [
      "Declaraciones de cumplimiento",
      data.section8.compliance
        .filter((item) => item.answer || trim(item.explanation))
        .map((item) => `#${item.id}: ${item.answer || "sin respuesta"}${trim(item.explanation) ? ` — ${trim(item.explanation)}` : ""}`)
        .join("; "),
    ],
    [
      "Documentos declarados",
      data.section9.documents
        .filter((document) => document.checked || trim(document.note))
        .map((document) => `${document.ref}${trim(document.note) ? `: ${trim(document.note)}` : ""}`)
        .join("; "),
    ],
    ["Autorizaciones", data.section10.authorizations.join(", ")],
    ["Firmante", data.section11.signerName],
    ["Cargo del firmante", data.section11.signerRole],
    ["Fecha de firma", data.section11.signedDate],
  ]
    .filter(([, value]) => trim(value))
    .map(([label, value]) => `${label}: ${trim(value)}`);
  if (notes.length > 0) {
    payload.Notes = `Datos del Portal de Proveedores\n${notes.join("\n")}`;
  }

  return payload;
}

function mergeRelatedRows(
  existingRows: unknown,
  incomingRows: Record<string, unknown>,
  identityFields: string[]
): Record<string, unknown>[] {
  const rows = Array.isArray(existingRows)
    ? existingRows.filter(
        (row): row is Record<string, unknown> =>
          Boolean(row) && typeof row === "object" && !Array.isArray(row)
      )
    : [];

  for (const incoming of [incomingRows]) {
    const identity = identityFields
      .map((field) => incoming[field])
      .find((value) => typeof value === "string" && value.trim());
    const match = identity
      ? rows.find((row) =>
          identityFields.some(
            (field) =>
              typeof row[field] === "string" &&
              String(row[field]).trim().toLocaleLowerCase() ===
                String(identity).trim().toLocaleLowerCase()
          )
        )
      : undefined;

    if (match) Object.assign(match, incoming);
    else rows.push(incoming);
  }

  return rows;
}

export function mergeVendorPayload(existing: AdmVendor, payload: AdmVendor): AdmVendor {
  const merged = { ...existing, ...payload };
  if (typeof payload.Notes === "string") {
    const existingNotes = typeof existing.Notes === "string" ? existing.Notes.trim() : "";
    const portalSection = "Datos del Portal de Proveedores\n";
    const previousPortalSection = existingNotes.indexOf(portalSection);
    const preservedNotes =
      previousPortalSection >= 0
        ? existingNotes.slice(0, previousPortalSection).trim()
        : existingNotes;
    merged.Notes = [preservedNotes, payload.Notes].filter(Boolean).join("\n\n");
  }
  if (payload.Contacts) {
    const contacts = Array.isArray(existing.Contacts) ? [...existing.Contacts] : [];
    for (const contact of payload.Contacts) {
      const email = typeof contact.EMail === "string" ? contact.EMail : "";
      const phone = typeof contact.Phone1 === "string" ? contact.Phone1 : "";
      const name = typeof contact.ShortName === "string" ? contact.ShortName : "";
      const incoming = { ...contact };
      const rows = mergeRelatedRows(contacts, incoming, [
        ...(email ? ["EMail"] : []),
        ...(phone ? ["Phone1"] : []),
        ...(name ? ["ShortName"] : []),
      ]);
      contacts.splice(0, contacts.length, ...rows);
    }
    merged.Contacts = contacts;
  }
  if (payload.Addresses) {
    const addresses = Array.isArray(existing.Addresses) ? [...existing.Addresses] : [];
    for (const address of payload.Addresses) {
      const incoming = { ...address };
      const rows = mergeRelatedRows(addresses, incoming, ["Address1"]);
      addresses.splice(0, addresses.length, ...rows);
    }
    merged.Addresses = addresses;
  }
  return merged;
}

export async function upsertVendorByTaxId(
  config: AdmConfig,
  data: SupplierData,
  fetchImpl: AdmFetch = fetch
): Promise<{ action: "created" | "updated" }> {
  const vendors = await fetchAdmVendors(config, fetchImpl);
  const payload = buildVendorPayload(data);
  const url = `${config.baseUrl}/Vendors?${buildAdmQuery(config)}`;
  const headers = { ...admAuthHeaders(config), "Content-Type": "application/json" };
  const existing = findAdmVendorByTaxId(vendors, trim(data.section1?.taxId));

  if (existing) {
    const id = getVendorId(existing);
    if (!id) throw new Error("adm_vendor_missing_id");
    const details = await fetchAdmVendorById(config, id, fetchImpl);
    const merged = mergeVendorPayload(details, payload);
    const res = await fetchImpl(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(merged),
    });
    if (!res.ok) throw new Error(`adm_vendor_update_${res.status}`);
    return { action: "updated" };
  }

  const res = await fetchImpl(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`adm_vendor_create_${res.status}`);
  return { action: "created" };
}

export async function syncVendorAfterDecision(
  config: AdmConfig | null,
  data: SupplierData | null | undefined,
  decision: string | undefined,
  fetchImpl: AdmFetch = fetch
): Promise<AdmSyncResult> {
  if (!data) return { ok: true, action: "skipped_no_data" };
  if (!decision || !ADM_FINAL_DECISIONS.includes(decision)) {
    return { ok: true, action: "skipped_decision" };
  }
  if (!config) return { ok: true, action: "skipped_not_configured" };

  const taxId = trim(data.section1?.taxId);
  if (!taxId) return { ok: true, action: "skipped_no_tax_id" };

  if (decision === "RECHAZADO") {
    const result = await deactivateVendorByTaxId(config, taxId, fetchImpl);
    return result.ok
      ? { ok: true, action: "deactivated" }
      : { ok: true, action: "rejected_not_in_adm" };
  }

  if (!isRegistrationApproved(decision)) return { ok: true, action: "skipped_decision" };

  if (!trim(data.section1?.legalName)) return { ok: true, action: "skipped_no_name" };

  const { action } = await upsertVendorByTaxId(config, data, fetchImpl);
  return { ok: true, action };
}
