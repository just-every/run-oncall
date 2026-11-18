import {phoneCountryData} from './phone-countries.ts';

export const phoneNumberError = 'Enter the number with digits only, for example 7700 900123.';
const regionNames = new Intl.DisplayNames(['en'], {type: 'region'});
export const phoneCountries = phoneCountryData.map(([code, region, prefix, zones]) => ({
  code, prefix, zones: zones.split(' '),
  label: `${code === 44 ? 'UK' : code === 1 ? 'US / Canada' : regionNames.of(region)} +${code}`,
})).sort((a, b) => a.label.localeCompare(b.label));
const internationalCodes = phoneCountries.toSorted((a, b) => String(b.code).length - String(a.code).length);

/** A time zone suggests a calling code; an unknown zone leaves the choice to the person. */
export function browserCallingCode(zone = Intl.DateTimeFormat().resolvedOptions().timeZone): number | null {
  return phoneCountries.find(country => country.zones.includes(zone))?.code ?? null;
}

/** Convert human entry to the existing server's calling-code plus national-digits contract. */
export function normalizePhone(input: string, selectedCode: number | null) {
  const entered = input.trim();
  if (!/^\+?[0-9\s()-]+$/.test(entered)) throw new Error(phoneNumberError);
  let address = entered.replace(/[^0-9]/g, '');
  let countryCode = selectedCode;
  if (entered.startsWith('+')) {
    const country = internationalCodes.find(candidate => address.startsWith(String(candidate.code)));
    if (!country) throw new Error(phoneNumberError);
    countryCode = country.code;
    address = address.slice(String(countryCode).length);
  }
  if (countryCode === null || !Number.isSafeInteger(countryCode) || countryCode < 1 || countryCode > 999)
    throw new Error('Choose the country for this phone number.');
  const prefix = phoneCountries.find(country => country.code === countryCode)?.prefix;
  // A leading zero is a trunk prefix only where the country's numbering plan says so.
  // International entries already omit nonzero trunk prefixes; retain significant digits.
  if (prefix && address.startsWith(prefix) && (prefix.startsWith('0') ||
    !entered.startsWith('+') && (prefix === '1' || prefix === '8') && address.length === 11))
    address = address.slice(prefix.length);
  if (!/^[0-9]{4,14}$/.test(address) || String(countryCode).length + address.length > 15)
    throw new Error(phoneNumberError);
  return {countryCode, address};
}

export function formatPhone(address: string, countryCode: number | null) {
  if (!address || countryCode === null) return address;
  const national = countryCode === 44 && address.length === 10
    ? `${address.slice(0, 4)} ${address.slice(4)}`
    : countryCode === 1 && address.length === 10
      ? `${address.slice(0, 3)} ${address.slice(3, 6)} ${address.slice(6)}` : address;
  return `+${countryCode} ${national}`;
}
