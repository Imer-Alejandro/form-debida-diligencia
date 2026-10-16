import { describe, expect, it } from "vitest";
import {
  canApproveException,
  canManageSuppliers,
  canManageUsers,
  canReadSupplierRecords,
  hasAnyRole,
  isAppRole,
  SUPPLIER_MANAGEMENT_ROLES,
} from "@/lib/access";

describe("application role permissions", () => {
  it("recognizes only configured application roles", () => {
    expect(isAppRole("ADMIN")).toBe(true);
    expect(isAppRole("DEPARTMENT_REVIEWER")).toBe(true);
    expect(isAppRole("authenticated")).toBe(false);
    expect(isAppRole(null)).toBe(false);
  });

  it("restricts account management to administrators", () => {
    expect(canManageUsers("ADMIN")).toBe(true);
    expect(canManageUsers("MANAGEMENT")).toBe(false);
    expect(canManageUsers("PURCHASING")).toBe(false);
  });

  it("allows only administrator and management to authorize exceptions", () => {
    expect(canApproveException("ADMIN")).toBe(true);
    expect(canApproveException("MANAGEMENT")).toBe(true);
    expect(canApproveException("PURCHASING")).toBe(false);
    expect(canApproveException("DEPARTMENT_REVIEWER")).toBe(false);
  });

  it("separates supplier viewing and management privileges", () => {
    expect(canReadSupplierRecords("READ_ONLY")).toBe(true);
    expect(canReadSupplierRecords("DEPARTMENT_REVIEWER")).toBe(false);
    expect(canManageSuppliers("PURCHASING")).toBe(true);
    expect(canManageSuppliers("MANAGEMENT")).toBe(false);
    expect(hasAnyRole("PURCHASING", SUPPLIER_MANAGEMENT_ROLES)).toBe(true);
    expect(hasAnyRole(null, SUPPLIER_MANAGEMENT_ROLES)).toBe(false);
  });
});
