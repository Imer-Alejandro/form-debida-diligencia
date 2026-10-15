import { describe, expect, it, vi } from "vitest";
import {
  ADM_DEFAULT_BASE_URL,
  admAuthHeaders,
  buildAdmQuery,
  buildVendorInactivePayload,
  deactivateVendorByTaxId,
  extractAdmVendors,
  fetchAdmVendors,
  findAdmVendorByTaxId,
  getVendorTaxId,
  normalizeTaxId,
  readAdmConfig,
  type AdmConfig,
} from "./adm";

const baseConfig: AdmConfig = {
  baseUrl: ADM_DEFAULT_BASE_URL,
  company: "demo",
  role: "Administrators",
  appid: "appid-123",
  username: "user@example.com",
  password: "secret",
};

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as unknown as Response;
}

describe("readAdmConfig", () => {
  it("returns null when required values are missing", () => {
    expect(readAdmConfig({})).toBeNull();
    expect(
      readAdmConfig({ ADM_COMPANY: "demo", ADM_ROLE: "Administrators", ADM_APPID: "x" })
    ).toBeNull();
  });

  it("uses the default base url and strips trailing slashes", () => {
    const config = readAdmConfig({
      ADM_BASE_URL: "https://api.admcloud.net/api/",
      ADM_COMPANY: "demo",
      ADM_ROLE: "Administrators",
      ADM_APPID: "appid-123",
      ADM_USERNAME: "user@example.com",
      ADM_PASSWORD: "secret",
    });

    expect(config?.baseUrl).toBe(ADM_DEFAULT_BASE_URL);
  });

  it("accepts token-only authentication", () => {
    const config = readAdmConfig({
      ADM_COMPANY: "demo",
      ADM_ROLE: "Administrators",
      ADM_APPID: "appid-123",
      ADM_TOKEN: "tok-123",
    });

    expect(config?.token).toBe("tok-123");
  });
});

describe("normalizeTaxId / getVendorTaxId", () => {
  it("normalizes separators and case", () => {
    expect(normalizeTaxId("1-31-12345-6")).toBe("131123456");
    expect(normalizeTaxId("  Ab 12 ")).toBe("ab12");
    expect(normalizeTaxId(undefined)).toBe("");
  });

  it("reads the tax id from the several field names ADM may use", () => {
    expect(getVendorTaxId({ TaxID: "131123456" })).toBe("131123456");
    expect(getVendorTaxId({ RNC: "1-31-12345-6" })).toBe("1-31-12345-6");
    expect(getVendorTaxId({ Name: "Acme" })).toBe("");
  });
});

describe("extractAdmVendors", () => {
  it("handles plain arrays and wrapped payloads", () => {
    expect(extractAdmVendors([{ ID: "1" }])).toHaveLength(1);
    expect(extractAdmVendors({ data: [{ ID: "1" }, { ID: "2" }] })).toHaveLength(2);
    expect(extractAdmVendors({ value: [{ ID: "1" }] })).toHaveLength(1);
    expect(extractAdmVendors({ nope: true })).toEqual([]);
    expect(extractAdmVendors(null)).toEqual([]);
  });
});

describe("findAdmVendorByTaxId", () => {
  it("matches vendors ignoring separators", () => {
    const vendors = [
      { ID: "a", TaxID: "402-12345-6" },
      { ID: "b", TaxID: "1-31-12345-6" },
    ];

    expect(findAdmVendorByTaxId(vendors, "131123456")?.ID).toBe("b");
    expect(findAdmVendorByTaxId(vendors, "999")).toBeNull();
    expect(findAdmVendorByTaxId(vendors, "")).toBeNull();
  });
});

describe("buildVendorInactivePayload", () => {
  it("sets Inactive while preserving the vendor fields", () => {
    expect(buildVendorInactivePayload({ ID: "a", Name: "Acme" })).toEqual({
      ID: "a",
      Name: "Acme",
      Inactive: true,
    });
  });
});

describe("buildAdmQuery / admAuthHeaders", () => {
  it("includes the context params and the token when present", () => {
    const query = new URLSearchParams(buildAdmQuery({ ...baseConfig, token: "tok-123" }, { skip: "0" }));
    expect(query.get("company")).toBe("demo");
    expect(query.get("appid")).toBe("appid-123");
    expect(query.get("skip")).toBe("0");
    expect(query.get("token")).toBe("tok-123");
  });

  it("uses Basic auth without a token and omits it with one", () => {
    expect(admAuthHeaders(baseConfig).Authorization).toBe(
      `Basic ${Buffer.from("user@example.com:secret").toString("base64")}`
    );
    expect(admAuthHeaders({ ...baseConfig, token: "tok-123" }).Authorization).toBeUndefined();
  });
});

describe("fetchAdmVendors", () => {
  it("requests the Vendors endpoint and returns the list", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: [{ ID: "1", TaxID: "131123456" }] }));
    const vendors = await fetchAdmVendors(baseConfig, fetchMock as unknown as typeof fetch);

    expect(vendors).toHaveLength(1);
    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url).toContain("/Vendors?");
    expect(url).toContain("company=demo");
  });

  it("throws when ADM responds with an error status", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, { ok: false, status: 500 }));
    await expect(
      fetchAdmVendors(baseConfig, fetchMock as unknown as typeof fetch)
    ).rejects.toThrow("adm_vendors_500");
  });
});

describe("deactivateVendorByTaxId", () => {
  it("returns not_found when the vendor is absent", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: [] }));
    const result = await deactivateVendorByTaxId(
      baseConfig,
      "131123456",
      fetchMock as unknown as typeof fetch
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("not_found");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends Inactive=true on the matched vendor", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") return jsonResponse({}, { status: 200 });
      return jsonResponse({ data: [{ ID: "b", TaxID: "1-31-12345-6" }] });
    });

    const result = await deactivateVendorByTaxId(
      baseConfig,
      "131123456",
      fetchMock as unknown as typeof fetch
    );

    expect(result.ok).toBe(true);
    const putCall = fetchMock.mock.calls.find(
      (call) => (call[1] as RequestInit | undefined)?.method === "PUT"
    );
    expect(putCall).toBeDefined();
    expect(JSON.parse(String((putCall?.[1] as RequestInit).body))).toMatchObject({
      ID: "b",
      Inactive: true,
    });
  });
});
