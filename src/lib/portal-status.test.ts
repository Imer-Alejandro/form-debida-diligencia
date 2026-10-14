import { describe, it, expect } from "vitest";

describe("Portal Status helpers", () => {
  it("extracts token from direct string and URL format", () => {
    function extractToken(input: string): string | null {
      const s = input.trim();
      const urlMatch = s.match(/\/i\/([A-Za-z0-9]+)/);
      const candidate = (urlMatch ? urlMatch[1] : s).toUpperCase();
      return /^[A-Z0-9]{8,}$/.test(candidate) ? candidate : null;
    }

    expect(extractToken("MMMWZZTH2UMSE5BL2RBPAKJNMBPMAZ5X")).toBe("MMMWZZTH2UMSE5BL2RBPAKJNMBPMAZ5X");
    expect(extractToken("https://form-debida-diligencia.vercel.app/i/GZP4VPDKWKH2RL2G6QWA39PGWGJJEKPW")).toBe("GZP4VPDKWKH2RL2G6QWA39PGWGJJEKPW");
    expect(extractToken("/i/7UL9FQNSV92VWFJZJ4SYL5MK5ZWHPXXT")).toBe("7UL9FQNSV92VWFJZJ4SYL5MK5ZWHPXXT");
    expect(extractToken("short")).toBe(null);
  });

  it("formats reference and masked tax id cleanly", () => {
    function maskTaxId(taxId?: string | null): string {
      if (!taxId) return "—";
      const clean = taxId.replace(/[^0-9A-Za-z]/g, "");
      if (clean.length < 6) return taxId;
      return clean.slice(0, 3) + "-***-" + clean.slice(-4);
    }

    expect(maskTaxId("40210977605")).toBe("402-***-7605");
    expect(maskTaxId(null)).toBe("—");
  });
});
