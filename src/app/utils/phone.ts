import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

// Phone numbers are checked against each country's numbering rules and saved
// in one international format (+2348031234567) - the backend checks them the
// same way (Functions::normalizePhone). A number without a + is read as
// being from the chosen country, Nigeria unless they pick another.
export const DEFAULT_COUNTRY: CountryCode = "NG";

export type Country = { code: CountryCode; name: string; dial: string; flag: string };

const flag = (code: string) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));

let countries: Country[] | null = null;
// Every country, Nigeria first then by name.
export function countryList(): Country[] {
  if (countries) return countries;
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(undefined, { type: "region" });
  } catch {
    // Older browsers: show the country code instead.
  }
  countries = getCountries()
    .map((code) => ({ code, name: names?.of(code) ?? code, dial: `+${getCountryCallingCode(code)}`, flag: flag(code) }))
    .sort((a, b) => (a.code === DEFAULT_COUNTRY ? -1 : b.code === DEFAULT_COUNTRY ? 1 : a.name.localeCompare(b.name)));
  return countries;
}

export function countryName(code: CountryCode): string {
  return countryList().find((c) => c.code === code)?.name ?? code;
}

// e164 is set only for a real number; empty is a blank box.
export function checkPhone(text: string, country: CountryCode = DEFAULT_COUNTRY): { e164: string | null; empty: boolean; country: CountryCode | null } {
  const raw = text.trim();
  if (!raw) return { e164: null, empty: true, country: null };
  const number = parsePhoneNumberFromString(raw, country);
  return { e164: number?.isValid() ? number.number : null, empty: false, country: number?.country ?? null };
}

// For display: +234 803 123 4567. Old numbers saved before checking began
// are shown as they were typed.
export function formatPhone(value?: string | null): string {
  if (!value) return "";
  const number = parsePhoneNumberFromString(value, DEFAULT_COUNTRY);
  return number?.isValid() ? number.formatInternational() : value;
}

// A saved number split back into the picker's country and the national part.
export function splitPhone(value: string): { country: CountryCode; national: string } {
  const number = value.startsWith("+") ? parsePhoneNumberFromString(value) : undefined;
  if (number?.country) return { country: number.country, national: number.formatNational() };
  return { country: DEFAULT_COUNTRY, national: value };
}
