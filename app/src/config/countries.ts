import { HIGH_RISK_COUNTRIES, MEDIUM_RISK_COUNTRIES } from '@/domain/rules';

export const KNOWN_COUNTRIES: readonly string[] = [
  'Australia',
  'Belarus',
  'Brazil',
  'Canada',
  'China',
  'France',
  'Germany',
  'India',
  'Italy',
  'Japan',
  'Mexico',
  'Netherlands',
  'New Zealand',
  'Nigeria',
  'Pakistan',
  'Portugal',
  'Russia',
  'Saudi Arabia',
  'Singapore',
  'South Africa',
  'South Korea',
  'Spain',
  'Sweden',
  'Switzerland',
  'Turkey',
  'UAE',
  'Ukraine',
  'United Kingdom',
  'United States',
  'Venezuela',
];

export function isHighRiskCountry(country: string): boolean {
  return (HIGH_RISK_COUNTRIES as readonly string[]).includes(country);
}

export function isMediumRiskCountry(country: string): boolean {
  return (MEDIUM_RISK_COUNTRIES as readonly string[]).includes(country);
}
