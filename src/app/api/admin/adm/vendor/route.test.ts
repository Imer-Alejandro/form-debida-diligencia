import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  deactivateVendorByTaxId: vi.fn(),
  readAdmConfig: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({
  getAdminSession: mocks.getAdminSession,
}));

vi.mock("@/lib/adm", () => ({
  deactivateVendorByTaxId: mocks.deactivateVendorByTaxId,
  readAdmConfig: mocks.readAdmConfig,
}));

import { POST } from "./route";

describe("POST /api/admin/adm/vendor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses to deactivate an ADM vendor before the registration is approved", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "registration-1", tax_id: "131123456", status: "PENDIENTE" },
        error: null,
      }),
    };
    mocks.getAdminSession.mockResolvedValue({
      supabase: { from: vi.fn(() => query) },
      user: { email: "admin@example.com" },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/adm/vendor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "registration-1" }),
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "registration_not_approved" });
    expect(mocks.readAdmConfig).not.toHaveBeenCalled();
    expect(mocks.deactivateVendorByTaxId).not.toHaveBeenCalled();
  });
});
