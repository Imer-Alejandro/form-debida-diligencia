export type PortalLookupOutcome = "found" | "not-found" | "service-error";

export function getPortalLookupOutcome(
  status: number,
  found: boolean
): PortalLookupOutcome {
  if (status >= 200 && status < 300) {
    return found ? "found" : "not-found";
  }

  return status === 404 ? "not-found" : "service-error";
}
