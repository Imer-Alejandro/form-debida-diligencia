import { getStatesOfCountry } from "country-state-city/lib/state";

export interface Subdivision {
  name: string;
  code: string;
}

const cache = new Map<string, Subdivision[]>();

/**
 * States / provinces for a given ISO country code, sorted by name. Imported
 * from the `state` submodule only, so the large city dataset is never bundled.
 * Returns an empty list when the country has no subdivisions (then the form
 * falls back to a free-text field).
 */
export function subdivisionsFor(countryCode: string): Subdivision[] {
  if (!countryCode) return [];
  const cached = cache.get(countryCode);
  if (cached) return cached;
  const list = getStatesOfCountry(countryCode)
    .map((state) => ({ name: state.name, code: state.isoCode }))
    .sort((a, b) => a.name.localeCompare(b.name));
  cache.set(countryCode, list);
  return list;
}

export function hasSubdivisions(countryCode: string): boolean {
  return subdivisionsFor(countryCode).length > 0;
}
