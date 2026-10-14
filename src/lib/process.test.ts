import { describe, expect, it } from "vitest";
import {
  allowedIncidentTransitions,
  canTransitionIncident,
  internalLinkPath,
  isSpecializationComplete,
  isTokenExpired,
  normalizeIncidentAction,
  normalizeIncidentSeverity,
  normalizeIncidentStatus,
  normalizeInternalKind,
  resolveInternalTokenStatus,
  specializedForTriggers,
  validateIncidentFollowUp,
  validateIncidentForm,
  validateServiceForm,
} from "@/lib/process";

describe("specializedForTriggers", () => {
  it("marks a triggered area as PENDIENTE", () => {
    const result = specializedForTriggers({ finance: true, legal: false, technology: false });
    expect(result.finance.status).toBe("PENDIENTE");
    expect(result.legal.status).toBe("NO_APLICA");
    expect(result.technology.status).toBe("NO_APLICA");
  });

  it("does not downgrade an area already approved", () => {
    const result = specializedForTriggers(
      { finance: true, legal: false, technology: false },
      { finance: { status: "APROBADA", notes: "", date: "", by: "" } }
    );
    expect(result.finance.status).toBe("APROBADA");
  });

  it("preserves a user's choice for an untriggered area", () => {
    const result = specializedForTriggers(
      { finance: false, legal: false, technology: false },
      { legal: { status: "CON_OBSERVACIONES", notes: "x", date: "", by: "" } }
    );
    expect(result.legal.status).toBe("CON_OBSERVACIONES");
  });
});

describe("isSpecializationComplete", () => {
  it("is complete when nothing is required", () => {
    expect(isSpecializationComplete(undefined, undefined)).toBe(true);
  });

  it("fails while a triggered area is still pending", () => {
    const specialized = specializedForTriggers({ finance: true, legal: false, technology: false });
    expect(isSpecializationComplete(specialized, { finance: true, legal: false, technology: false })).toBe(
      false
    );
  });

  it("passes once triggered areas are approved", () => {
    const specialized = specializedForTriggers(
      { finance: true, legal: false, technology: false },
      { finance: { status: "APROBADA", notes: "", date: "", by: "" } }
    );
    expect(isSpecializationComplete(specialized, { finance: true, legal: false, technology: false })).toBe(
      true
    );
  });
});

describe("internal tokens", () => {
  it("normalizes kinds", () => {
    expect(normalizeInternalKind("INCIDENT")).toBe("INCIDENT");
    expect(normalizeInternalKind("nope")).toBeNull();
  });

  it("detects expiration", () => {
    const now = Date.parse("2026-01-02T00:00:00Z");
    expect(isTokenExpired(null, now)).toBe(false);
    expect(isTokenExpired("2026-01-03T00:00:00Z", now)).toBe(false);
    expect(isTokenExpired("2026-01-01T00:00:00Z", now)).toBe(true);
  });

  it("resolves the effective status with used taking precedence", () => {
    expect(resolveInternalTokenStatus({ used_at: "2026-01-01T00:00:00Z", expires_at: null })).toBe(
      "USADO"
    );
    expect(
      resolveInternalTokenStatus({ used_at: null, expires_at: "2000-01-01T00:00:00Z" })
    ).toBe("EXPIRADO");
    expect(resolveInternalTokenStatus({ used_at: null, expires_at: null })).toBe("PENDIENTE");
  });

  it("builds an encoded link path", () => {
    expect(internalLinkPath("a b/c")).toBe("/interno/a%20b%2Fc");
  });
});

describe("validateServiceForm", () => {
  const base = {
    area: "Compras",
    quality: 4,
    delivery: 5,
    price: 3,
    compliance: 4,
    service: 5,
    recommendation: "SEGUIR",
  };

  it("accepts a valid submission", () => {
    const r = validateServiceForm(base);
    expect(r.ok).toBe(true);
    expect(r.normalized?.quality).toBe(4);
    expect(r.normalized?.recommendation).toBe("SEGUIR");
    expect(r.normalized?.purchase_date).toBeNull();
  });

  it("requires an area", () => {
    const r = validateServiceForm({ ...base, area: "  " });
    expect(r.ok).toBe(false);
    expect(r.errors.area).toBe("required");
  });

  it("rejects ratings outside 1..5", () => {
    expect(validateServiceForm({ ...base, quality: 0 }).errors.quality).toBe("invalid_rating");
    expect(validateServiceForm({ ...base, delivery: 6 }).errors.delivery).toBe("invalid_rating");
  });

  it("rounds fractional ratings", () => {
    const r = validateServiceForm({ ...base, price: 3.6 });
    expect(r.normalized?.price).toBe(4);
  });

  it("rejects an unknown recommendation", () => {
    expect(validateServiceForm({ ...base, recommendation: "TALVEZ" }).errors.recommendation).toBe(
      "invalid"
    );
  });
});

describe("incident workflow", () => {
  it("allows valid transitions and blocks the rest", () => {
    expect(canTransitionIncident("ABIERTA", "EN_SEGUIMIENTO")).toBe(true);
    expect(canTransitionIncident("ABIERTA", "CORRECCION_SOLICITADA")).toBe(false);
    expect(canTransitionIncident("CERRADA", "ABIERTA")).toBe(false);
    expect(allowedIncidentTransitions("CERRADA")).toEqual([]);
  });

  it("normalizes unknown values", () => {
    expect(normalizeIncidentStatus("X")).toBe("ABIERTA");
    expect(normalizeIncidentAction("X")).toBe("NINGUNO");
    expect(normalizeIncidentSeverity("X")).toBe("MEDIA");
  });

  it("validates the report form", () => {
    expect(validateIncidentForm({}).ok).toBe(false);
    const r = validateIncidentForm({
      area: "Operaciones",
      incidentDate: "2026-01-10",
      description: "Entrega tardía",
      severity: "ALTA",
    });
    expect(r.ok).toBe(true);
    expect(r.normalized?.severity).toBe("ALTA");
  });

  it("rejects an unreachable status transition", () => {
    const r = validateIncidentFollowUp("CERRADA", { status: "ABIERTA" });
    expect(r.ok).toBe(false);
    expect(r.errors.status).toBe("invalid_transition");
  });

  it("requires notes when resolving with no action", () => {
    const r = validateIncidentFollowUp("EN_SEGUIMIENTO", {
      status: "RESUELTA",
      recommendedAction: "NINGUNO",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.resolutionNotes).toBe("required");
  });

  it("accepts resolving with notes", () => {
    const r = validateIncidentFollowUp("EN_SEGUIMIENTO", {
      status: "RESUELTA",
      resolutionNotes: "Se corrigió el proceso.",
    });
    expect(r.ok).toBe(true);
    expect(r.normalized?.status).toBe("RESUELTA");
  });
});
