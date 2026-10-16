import { describe, expect, it } from "vitest";
import { departmentReviewEmail, parseMailRecipients } from "@/lib/mail";

describe("department review notification", () => {
  it("normalizes comma- or semicolon-separated responsible addresses", () => {
    expect(
      parseMailRecipients("Owner@Example.com; second@example.com, owner@example.com")
    ).toEqual(["owner@example.com", "second@example.com"]);
  });

  it("notifies the department owner and links directly to the assigned case", () => {
    const message = departmentReviewEmail({
      company: "Proveedor Uno",
      reference: "SB-2026-0010",
      department: "Finanzas",
      requestReason: "Validar capacidad y solvencia financiera",
      link: "https://portal.example/admin/reviews/review-123",
    });

    expect(message.subject).toContain("Finanzas");
    expect(message.subject).toContain("Proveedor Uno");
    expect(message.text).toContain("responsable de Finanzas");
    expect(message.text).toContain("Validar capacidad y solvencia financiera");
    expect(message.text).toContain("/admin/reviews/review-123");
    expect(message.html).toContain("/admin/reviews/review-123");
  });

  it("escapes department-provided text in the HTML email", () => {
    const message = departmentReviewEmail({
      company: "<Proveedor>",
      reference: null,
      department: "Legal",
      requestReason: "<script>alert(1)</script>",
      link: "https://portal.example/admin/reviews/review-123",
    });

    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;Proveedor&gt;");
    expect(message.html).toContain("&lt;script&gt;");
  });
});
