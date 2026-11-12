import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  rpc: vi.fn(),
  readAdmConfig: vi.fn(),
  syncVendorAfterDecision: vi.fn(),
  ensureDepartmentReviewerAccount: vi.fn(),
  sendMail: vi.fn(),
  events: [] as string[],
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
  getDepartmentReviewIdsToDispatch: vi.fn((departments: string[]) => departments),
}));

vi.mock("@/lib/adm", () => ({
  ADM_FINAL_DECISIONS: ["APROBADO", "APROBADO_CONDICIONES", "RECHAZADO"],
  readAdmConfig: mocks.readAdmConfig,
  syncVendorAfterDecision: mocks.syncVendorAfterDecision,
}));

vi.mock("@/lib/mail", () => ({
  departmentReviewEmail: vi.fn(() => ({
    to: "",
    subject: "review",
    text: "review",
    html: "review",
  })),
  parseMailRecipients: vi.fn(() => ["reviewer@example.com"]),
  sendMail: mocks.sendMail,
}));

vi.mock("@/lib/department-reviewer-account", () => ({
  ensureDepartmentReviewerAccount: mocks.ensureDepartmentReviewerAccount,
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
    mocks.events.length = 0;
    mocks.sendMail.mockImplementation(async () => {
      mocks.events.push("email");
    });
    mocks.ensureDepartmentReviewerAccount.mockImplementation(async () => {
      mocks.events.push("access");
      return [{ email: "reviewer@example.com", status: "unchanged" }];
    });
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

  it("provisions reviewer access before sending evaluation dispatch requests", async () => {
    const request = dispatchRequest();
    const supabase = dispatchSupabase();
    mocks.getAdminSession.mockResolvedValue({
      supabase,
      user: { id: "admin-1", email: "admin@example.com" },
      role: "ADMIN",
    });
    mocks.rpc.mockImplementation(async (name: string) => {
      mocks.events.push(name === "save_supplier_evaluation" ? "save" : "transition");
      return { data: null, error: null };
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.departmentRequests).toEqual([
      { department: "TECHNICAL", status: "sent", accountStatus: "ready" },
    ]);
    expect(mocks.events).toEqual(["save", "access", "email", "transition"]);
  });

  it("does not email or mark an evaluation dispatch sent when reviewer access conflicts", async () => {
    mocks.ensureDepartmentReviewerAccount.mockImplementation(async () => {
      mocks.events.push("access");
      return [{ email: "reviewer@example.com", status: "role_conflict" }];
    });
    mocks.getAdminSession.mockResolvedValue({
      supabase: dispatchSupabase(),
      user: { id: "admin-1", email: "admin@example.com" },
      role: "ADMIN",
    });
    mocks.rpc.mockImplementation(async (name: string) => {
      mocks.events.push(name === "save_supplier_evaluation" ? "save" : "transition");
      return { data: null, error: null };
    });

    const response = await POST(dispatchRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.departmentRequests).toEqual([
      {
        department: "TECHNICAL",
        status: "failed",
        accountStatus: "role_conflict",
      },
    ]);
    expect(mocks.events).toEqual(["save", "access"]);
  });
});

function dispatchRequest() {
  return new Request("http://localhost/api/admin/evaluation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "registration-1",
      dispatchDepartmentRequests: true,
      evaluation: {
        section12: {
          riskCategories: {},
          requiredDepartments: ["TECHNICAL"],
          departmentReasons: { TECHNICAL: "Please review this service." },
          specialized: {},
        },
      },
    }),
  });
}

function dispatchSupabase() {
  const departmentReview = {
    id: "review-1",
    department: "TECHNICAL",
    request_reason: "Please review this service.",
    status: "REQUESTED",
    sent_at: null,
  };
  const department = {
    id: "TECHNICAL",
    name: "Technical",
    recipient_email: "reviewer@example.com",
  };
  const supplier = {
    status: "EN_REVISION",
    company_name: "Supplier",
    reference_no: "SB-2026-0001",
  };
  const rowsFor = (table: string, columns: string) => {
    if (table === "review_departments") {
      return columns === "id" ? [{ id: "TECHNICAL" }] : [department];
    }
    if (table === "department_reviews") return [departmentReview];
    if (table === "supplier_registrations") {
      return columns === "status" ? { status: supplier.status } : supplier;
    }
    return [];
  };
  return {
    from: (table: string) => {
      let data: unknown = [];
      const builder = {
        select: (columns: string) => {
          data = rowsFor(table, columns);
          return builder;
        },
        eq: () => builder,
        in: () => builder,
        maybeSingle: async () => ({ data, error: null }),
        then: (
          resolve: (value: { data: unknown; error: null }) => unknown,
          reject: (reason: unknown) => unknown
        ) => Promise.resolve({ data, error: null }).then(resolve, reject),
      };
      return builder;
    },
    rpc: mocks.rpc,
  };
}
