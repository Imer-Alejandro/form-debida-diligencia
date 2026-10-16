import { describe, expect, it } from "vitest";
import { supplierFilePath, supplierFolderPath } from "./onedrive";

describe("supplier SharePoint folder paths", () => {
  it("uses the same sanitized supplier folder for the link and uploaded files", () => {
    const folderPath = supplierFolderPath("Acme/One");

    expect(folderPath).toBe("Due Diligence - Sanchez Business Corp/Acme_One");
    expect(supplierFilePath("Acme/One", "registration-1", "A", "tax form.pdf")).toBe(
      `${folderPath}/A - registration-1/tax form.pdf`
    );
  });
});
