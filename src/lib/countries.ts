import isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import esLocale from "i18n-iso-countries/langs/es.json";

isoCountries.registerLocale(enLocale);
isoCountries.registerLocale(esLocale);

export type CountryLanguage = "es" | "en";

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

function countryFlag(code: string): string {
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((character) => 127397 + character.charCodeAt(0))
  );
}

const namesByLanguage = {
  es: isoCountries.getNames("es", { select: "official" }),
  en: isoCountries.getNames("en", { select: "official" }),
};

export const countryOptions: Record<CountryLanguage, CountryOption[]> = {
  es: buildOptions("es"),
  en: buildOptions("en"),
};

function buildOptions(language: CountryLanguage): CountryOption[] {
  return Object.entries(namesByLanguage[language])
    .map(([code, name]) => ({ code, name, flag: countryFlag(code) }))
    .sort((first, second) => first.name.localeCompare(second.name, language));
}

export function countryName(code: string, language: CountryLanguage): string {
  return isoCountries.getName(code, language) ?? code;
}