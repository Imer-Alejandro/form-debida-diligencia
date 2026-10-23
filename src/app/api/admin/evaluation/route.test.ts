import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  rpc: vi.fn(),
  readAdmConfig: vi.fn(),
  syncVendorAfterDecision: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({
  getAdminSession: mocks.getAdminSession,
}));

vi.mock("@/lib/risk", () => ({
  computeRisk: vi.fn(() => ({ level: "BAJO", rated: 1, average: 1 })),
  evaluateTriggers: vi.fn(() => ({
    finance: false,
    legal: false,
    technology: false,
    requiresEscalation: false,
  })),
}));

vi.mock("@/lib/process", () => ({
  specializedForTriggers: vi.fn(() => ({})),
}));

vi.mock("@/lib/department-dispatch", () => ({
  getDepartmentReviewIdsToDispatch: vi.fn(() => []),
}));

vi.mock("@/lib/adm", () => ({
  ADM_FINAL_DECISIONS: ["APROBADO", "APROBADO_CONDICIONES", "RECHAZADO"],
  readAdmConfig: mocks.readAdmConfig,
  syncVendorAfterDecision: mocks.syncVendorAfterDecision,
}));

vi.mock("@/lib/mail", () => ({
  departmentReviewEmail: vi.fn(),
  parseMailRecipients: vi.fn(() => []),
  sendMail: vi.fn(),
}));

vi.mock("@/lib/department-reviewer-account", () => ({
  ensureDepartmentReviewerAccount: vi.fn(),
}));

vi.mock("@/lib/onedrive", () => ({
  getAccessToken: vi.fn(),
  getItemIdByPath: vi.fn(),
  getItemWebUrl: vi.fn(),
  ItemNotFoundError: class ItemNotFoundError extends Error {},
  OneDriveNotConfiguredError: class OneDriveNotConfiguredError extends Error {},
  supplierFolderPath: vi.fn(),
}));

import { POST } from "./route";

describe("POST /api/admin/evaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: null,
      error: {
        code: "42703",
        message: 'column "requested_by" of relation "department_reviews" does not exist',
      },
    });
    mocks.getAdminSession.mockResolvedValue({
      supabase: { rpc: mocks.rpc },
      user: { id: "user-1", email: "admin@example.com" },
      role: "ADMIN",
    });
  });

  it("returns the missing-column diagnostic and does not start ADM sync", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "registration-1",
          evaluation: {
            section12: {
              riskCategories: {},
              requiredDepartments: [],
              specialized: {},
            },
            section13: { decision: "RECHAZADO" },
          },
        }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "evaluation_save_failed",
      diagnosticCode: "42703",
      diagnosticDetail:
        'column "requested_by" of relation "department_reviews" does not exist',
      stage: "save_evaluation",
    });
    expect(mocks.syncVendorAfterDecision).not.toHaveBeenCalled();
  });
});
