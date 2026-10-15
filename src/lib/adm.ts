import type { SupplierData } from "./types";

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
  Inactive?: boolean;
  [key: string]: unknown;
}

export interface AdmDeactivateResult {
  ok: boolean;
  reason?: "not_found";
  vendor?: AdmVendor;
}

export type AdmFetch = typeof fetch;

export type AdmEnv = Record<string, string | undefined>;

const TAX_ID_KEYS = ["TaxID", "TaxId", "taxId", "TaxNumber", "TaxNumberID", "RNC", "Rnc", "rnc"];
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

export function extractAdmVendors(payload: unknown): AdmVendor[] {
  if (Array.isArray(payload)) return payload as AdmVendor[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of LIST_KEYS) {
      const value = record[key];
      if (Array.isArray(value)) return value as AdmVendor[];
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
  await deactivateAdmVendor(config, vendor, fetchImpl);
  return { ok: true, vendor };
}

export const ADM_APPROVE_DECISIONS = ["APROBADO", "APROBADO_CONDICIONES"];
export const ADM_FINAL_DECISIONS = [...ADM_APPROVE_DECISIONS, "RECHAZADO"];

export type AdmSyncAction =
  | "created"
  | "updated"
  | "deactivated"
  | "rejected_not_in_adm"
  | "skipped_decision"
  | "skipped_not_configured"
  | "skipped_no_tax_id"
  | "skipped_no_data";

export interface AdmSyncResult {
  ok: boolean;
  action?: AdmSyncAction;
  error?: string;
}

export function buildVendorPayload(data: SupplierData): AdmVendor {
  const s1 = data.section1;
  const contact = data.section2?.contacts?.[0];
  const payload: AdmVendor = {
    Name: trim(s1.legalName),
    IsVendor: true,
    Inactive: false,
  };
  if (trim(s1.commercialName)) payload.ComercialName = trim(s1.commercialName);
  if (trim(s1.taxId)) payload.FiscalID = trim(s1.taxId);
  if (trim(contact?.email)) payload.EMail = trim(contact?.email);
  if (trim(contact?.phone)) payload.Phone1 = trim(contact?.phone);
  if (trim(s1.website)) payload.WebPage = trim(s1.website);
  if (trim(s1.mainEconomicActivity)) payload.BusinessActivity = trim(s1.mainEconomicActivity);
  return payload;
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
    const merged = { ...existing, ...payload };
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

  const { action } = await upsertVendorByTaxId(config, data, fetchImpl);
  return { ok: true, action };
}
