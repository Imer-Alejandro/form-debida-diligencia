import { describe, expect, it, vi } from "vitest";
import {
  ADM_DEFAULT_BASE_URL,
  admAuthHeaders,
  buildAdmQuery,
  fetchAdmVendorById,
  buildVendorInactivePayload,
  buildVendorPayload,
  deactivateVendorByTaxId,
  extractAdmVendors,
  fetchAdmVendors,
  findAdmVendorByTaxId,
  getVendorId,
  getVendorTaxId,
  mergeVendorPayload,
  normalizeTaxId,
  readAdmConfig,
  syncVendorAfterDecision,
  upsertVendorByTaxId,
  type AdmConfig,
} from "./adm";
import {
  emptyData,
  isFinalRegistrationDecision,
  isRegistrationApproved,
} from "./types";

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

  describe("isRegistrationApproved", () => {
    it("allows only approved registration statuses", () => {
      expect(isRegistrationApproved("APROBADO")).toBe(true);
      expect(isRegistrationApproved("APROBADO_CONDICIONES")).toBe(true);
      expect(isRegistrationApproved("PENDIENTE")).toBe(false);
      expect(isRegistrationApproved("RECHAZADO")).toBe(false);
      expect(isRegistrationApproved(undefined)).toBe(false);
    });
  });

  describe("isFinalRegistrationDecision", () => {
    it("allows only approval and rejection decisions to be confirmed", () => {
      expect(isFinalRegistrationDecision("APROBADO")).toBe(true);
      expect(isFinalRegistrationDecision("APROBADO_CONDICIONES")).toBe(true);
      expect(isFinalRegistrationDecision("RECHAZADO")).toBe(true);
      expect(isFinalRegistrationDecision("PENDIENTE")).toBe(false);
      expect(isFinalRegistrationDecision("EN_REVISION")).toBe(false);
      expect(isFinalRegistrationDecision(undefined)).toBe(false);
    });
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
    expect(getVendorTaxId({ FiscalID: "1-31-12345-6" })).toBe("1-31-12345-6");
    expect(getVendorTaxId({ RNC: "1-31-12345-6" })).toBe("1-31-12345-6");
    expect(getVendorTaxId({ Name: "Acme" })).toBe("");
  });

  it("reads the ADM vendor identifier", () => {
    expect(getVendorId({ ID: "vendor-id" })).toBe("vendor-id");
    expect(getVendorId({ id: "vendor-id" })).toBe("vendor-id");
    expect(getVendorId({})).toBe("");
  });
});

describe("extractAdmVendors", () => {
  it("handles plain arrays and wrapped payloads", () => {
    expect(extractAdmVendors([{ ID: "1" }])).toHaveLength(1);
    expect(extractAdmVendors({ data: [{ ID: "1" }, { ID: "2" }] })).toHaveLength(2);
    expect(extractAdmVendors({ success: true, data: { ID: "1", FiscalID: "123" } })).toHaveLength(1);
    expect(extractAdmVendors({ value: [{ ID: "1" }] })).toHaveLength(1);
    expect(extractAdmVendors({ nope: true })).toEqual([]);
    expect(extractAdmVendors(null)).toEqual([]);
  });

  describe("fetchAdmVendorById", () => {
    it("uses the vendor ID endpoint and unwraps ADM's response", async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse({ success: true, data: { ID: "vendor/1", Name: "Acme", FiscalID: "123" } })
      );

      const vendor = await fetchAdmVendorById(
        baseConfig,
        "vendor/1",
        fetchMock as unknown as typeof fetch
      );

      expect(vendor.Name).toBe("Acme");
      const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
      expect(url).toContain("/Vendors/vendor%2F1?");
      expect(url).toContain("company=demo");
      expect(url).toContain("role=Administrators");
      expect(url).toContain("appid=appid-123");
    });
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

describe("buildVendorPayload", () => {
  it("maps basic fields to the ADM vendor shape", () => {
    const data = emptyData();
    data.section1.legalName = "Sánchez Business & Corp.";
    data.section1.commercialName = "SBC";
    data.section1.taxId = "1-31-12345-6";
    data.section1.website = "https://sbc.do";
    data.section1.mainEconomicActivity = "Servicios";
    data.section1.goodsServices = "Consultoría y soporte";
    data.section1.legalAddress = "Calle Principal 10";
    data.section1.provinceCountry = "Santo Domingo";
    data.section3.relatedToSbc = "no";
    data.section2.contacts[0].email = "compras@sbc.do";
    data.section2.contacts[0].name = "María Pérez";
    data.section2.contacts[0].position = "Representante";
    data.section2.contacts[0].phone = "8095551234";
    data.section5.bank = "Banco Demo";
    data.section5.accountHolder = "SBC SRL";
    data.section5.accountHolderId = "131123456";
    data.section5.accountNumber = "001234";
    data.section5.currency = "USD";
    data.section5.swift = "DEMOUS";
    data.section5.accountType = ["corriente"];
    data.section5.paymentTerms = ["credito"];
    data.section5.creditDays = "30";
    data.section3.legalRepName = "María Pérez";
    data.section3.legalRepId = "001-1234567-8";
    data.section4.taxCondition = "aldia";
    data.section6.yearsExperience = "10";

    const payload = buildVendorPayload(data, "https://contoso.sharepoint.com/sites/dd/Acme");
    expect(payload.Name).toBe("Sánchez Business & Corp.");
    expect(payload.ComercialName).toBe("SBC");
    expect(payload.FiscalID).toBe("1-31-12345-6");
    expect(payload.EMail).toBe("compras@sbc.do");
    expect(payload.Phone1).toBe("8095551234");
    expect(payload.WebPage).toBe("https://sbc.do");
    expect(payload.BusinessActivity).toBe("Servicios");
    expect(payload.Profile).toBe("Consultoría y soporte");
    expect(payload.IsRelated).toBe(false);
    expect(payload.CurrencyID).toBe("USD");
    expect(payload.BankAccountCurrencyID).toBe("USD");
    expect(payload.BankAccountNumber).toBe("001234");
    expect(payload.Contacts).toEqual([
      expect.objectContaining({
        FirstName: "María",
        LastName: "Pérez",
        ShortName: "María Pérez",
        Position: "Representante",
        Phone1: "8095551234",
        EMail: "compras@sbc.do",
      }),
    ]);
    expect(payload.Addresses).toEqual([
      { Address1: "Calle Principal 10", State: "Santo Domingo" },
    ]);
    expect(payload.Notes).toContain("Banco: Banco Demo");
    expect(payload.Notes).toContain(
      "Documentos de debida diligencia en SharePoint: https://contoso.sharepoint.com/sites/dd/Acme"
    );
    expect(payload.Notes).toContain("Condición fiscal: aldia");
    expect(payload.Notes).toContain("Experiencia (años): 10");
    expect(payload.IsVendor).toBe(true);
    expect(payload.Inactive).toBe(false);
  });
});

describe("mergeVendorPayload", () => {
  it("preserves ADM-owned fields, notes, and related records while refreshing portal data", () => {
    const merged = mergeVendorPayload(
      {
        ID: "vendor-1",
        Name: "Old name",
        Profile: "ADM profile",
        Notes: "Notas de ADM",
        Contacts: [
          { ID: "contact-1", EMail: "user@example.com", Notes: "ADM contact note" },
          { ID: "contact-2", EMail: "other@example.com" },
        ],
        Addresses: [
          { ID: "address-1", Address1: "Calle 1", City: "Santo Domingo" },
        ],
      },
      {
        Name: "New name",
        Notes: "Datos del Portal de Proveedores\nBanco: Banco Demo",
        Contacts: [{ EMail: "user@example.com", Phone1: "8095551234" }],
        Addresses: [{ Address1: "Calle 1", State: "Distrito Nacional" }],
      }
    );

    expect(merged).toMatchObject({
      ID: "vendor-1",
      Name: "New name",
      Profile: "ADM profile",
      Notes: "Notas de ADM\n\nDatos del Portal de Proveedores\nBanco: Banco Demo",
      Contacts: [
        { ID: "contact-1", EMail: "user@example.com", Phone1: "8095551234", Notes: "ADM contact note" },
        { ID: "contact-2", EMail: "other@example.com" },
      ],
      Addresses: [
        { ID: "address-1", Address1: "Calle 1", City: "Santo Domingo", State: "Distrito Nacional" },
      ],
    });
  });

  it("replaces the previous portal details without duplicating them in ADM notes", () => {
    const merged = mergeVendorPayload(
      {
        Notes: "Notas de ADM\n\nDatos del Portal de Proveedores\nDato anterior",
      },
      { Notes: "Datos del Portal de Proveedores\nDato actualizado" }
    );

    expect(merged.Notes).toBe("Notas de ADM\n\nDatos del Portal de Proveedores\nDato actualizado");
  });
});

describe("upsertVendorByTaxId", () => {
  it("creates a vendor when none is found", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") return jsonResponse({ ID: "new" }, { status: 201 });
      return jsonResponse({ data: [] });
    });
    const data = emptyData();
    data.section1.legalName = "Acme SRL";
    data.section1.taxId = "131123456";

    const result = await upsertVendorByTaxId(baseConfig, data, fetchMock as unknown as typeof fetch);
    expect(result.action).toBe("created");
    const postCall = fetchMock.mock.calls.find(
      (call) => (call[1] as RequestInit | undefined)?.method === "POST"
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(String((postCall?.[1] as RequestInit).body));
    expect(body.Name).toBe("Acme SRL");
    expect(body.Inactive).toBe(false);
    expect(body.IsVendor).toBe(true);
  });

  it("updates an existing vendor when found", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") return jsonResponse({}, { status: 200 });
      if (String(_url).includes("/Vendors/b?")) {
        return jsonResponse({
          success: true,
          data: {
            ID: "b",
            FiscalID: "1-31-12345-6",
            Profile: "ADM profile",
            Contacts: [{ ID: "contact-1", EMail: "existing@example.com" }],
          },
        });
      }
      return jsonResponse({ data: [{ ID: "b", TaxID: "1-31-12345-6" }] });
    });
    const data = emptyData();
    data.section1.legalName = "Acme Updated";
    data.section1.taxId = "131123456";

    const result = await upsertVendorByTaxId(baseConfig, data, fetchMock as unknown as typeof fetch);
    expect(result.action).toBe("updated");
    const putCall = fetchMock.mock.calls.find(
      (call) => (call[1] as RequestInit | undefined)?.method === "PUT"
    );
    expect(putCall).toBeDefined();
    const body = JSON.parse(String((putCall?.[1] as RequestInit).body));
    expect(body.ID).toBe("b");
    expect(body.Name).toBe("Acme Updated");
    expect(body.Inactive).toBe(false);
    expect(body.Profile).toBe("ADM profile");
    expect(body.Contacts).toEqual([
      { ID: "contact-1", EMail: "existing@example.com" },
    ]);
  });
});

describe("syncVendorAfterDecision", () => {
  it("does not create on REJECTED if not found in ADM", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: [] }));
    const data = emptyData();
    data.section1.legalName = "Rejected";
    data.section1.taxId = "131123456";

    const res = await syncVendorAfterDecision(baseConfig, data, "RECHAZADO", fetchMock as unknown as typeof fetch);
    expect(res.ok).toBe(true);
    expect(res.action).toBe("rejected_not_in_adm");
    const methods = fetchMock.mock.calls.map((c) => {
      const call = c as unknown as [unknown, RequestInit | undefined];
      return call[1]?.method;
    }) as (string|undefined)[];
    expect(methods.includes("GET")).toBe(true);
    expect(methods.includes("POST")).toBe(false);
    expect(methods.includes("PUT")).toBe(false);
  });

  it("creates vendor on APROBADO", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") return jsonResponse({ ID: "n1" }, { status: 201 });
      return jsonResponse({ data: [] });
    });
    const data = emptyData();
    data.section1.legalName = "Ok";
    data.section1.taxId = "131123456";

    const sharePointFolderUrl = "https://contoso.sharepoint.com/sites/dd/Ok";
    const res = await syncVendorAfterDecision(
      baseConfig,
      data,
      "APROBADO",
      fetchMock as unknown as typeof fetch,
      sharePointFolderUrl
    );
    expect(res.ok).toBe(true);
    expect(res.action).toBe("created");
    const postCall = fetchMock.mock.calls.find(
      (call) => (call[1] as RequestInit | undefined)?.method === "POST"
    );
    const body = JSON.parse(String((postCall?.[1] as RequestInit | undefined)?.body));
    expect(body.Notes).toContain(sharePointFolderUrl);
  });

  it("skips when not configured or no decision", async () => {
    const data = emptyData();
    data.section1.taxId = "131123456";
    const r1 = await syncVendorAfterDecision(null, data, "APROBADO", vi.fn() as unknown as typeof fetch);
    const r2 = await syncVendorAfterDecision(baseConfig, data, "PENDIENTE", vi.fn() as unknown as typeof fetch);
    const r3 = await syncVendorAfterDecision(baseConfig, data, undefined, vi.fn() as unknown as typeof fetch);
    expect(r1.action).toBe("skipped_not_configured");
    expect(r2.action).toBe("skipped_decision");
    expect(r3.action).toBe("skipped_decision");
  });

  it("skips when no tax id", async () => {
    const data = emptyData();
    const res = await syncVendorAfterDecision(baseConfig, data, "APROBADO", vi.fn() as unknown as typeof fetch);
    expect(res.action).toBe("skipped_no_tax_id");
  });
});