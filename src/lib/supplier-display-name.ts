export function getSupplierDisplayName(
  ...names: (string | null | undefined)[]
): string {
  return names.find((name) => typeof name === "string" && name.trim())?.trim() ?? "";
}
