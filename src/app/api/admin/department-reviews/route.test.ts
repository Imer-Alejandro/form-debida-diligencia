import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  ensureDepartmentReviewerAccount: vi.fn(),
  sendMail: vi.fn(),
  rpc: vi.fn(),
  events: [] as string[],
}));

vi.mock("@/lib/supabase/auth", () => ({
  getAdminSession: mocks.getAdminSession,
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

import { POST } from "./route";

function request(action = "SEND") {
  return new Request("http://localhost/api/admin/department-reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "review-1", action }),
  });
}

describe("POST /api/admin/department-reviews SEND", () => {
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
    mocks.rpc.mockImplementation(async () => {
      mocks.events.push("transition");
      return { data: { id: "review-1", sent_at: "2026-11-12T12:00:00Z" }, error: null };
    });

    const review = {
      id: "review-1",
      registration_id: "registration-1",
      department: "TECHNICAL",
      request_reason: "Validar el servicio",
      status: "REQUESTED",
      sent_at: null,
      review_departments: {
        name: "Área técnica",
        recipient_email: "reviewer@example.com",
      },
      supplier_registrations: {
        company_name: "Proveedor de prueba",
        reference_no: "SB-2026-0001",
      },
    };
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: review, error: null }),
          })),
        })),
      })),
      rpc: mocks.rpc,
    };
    mocks.getAdminSession.mockResolvedValue({
      supabase,
      user: { id: "admin-1", email: "admin@example.com" },
      role: "ADMIN",
    });
  });

  it("does not send the request when reviewer access could not be provisioned", async () => {
    mocks.ensureDepartmentReviewerAccount.mockResolvedValue([
      { email: "reviewer@example.com", status: "role_conflict" },
    ]);

    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "reviewer_access_not_ready",
    });
    expect(mocks.sendMail).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("provisions reviewer access before sending and marking the request sent", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(mocks.events).toEqual(["access", "email", "transition"]);
  });

  it("does not allow the sender to submit the department review", async () => {
    const response = await POST(request("RECEIVE"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "forbidden" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
