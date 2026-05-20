import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from '@/adapters/csv-parser';
import type {
  Branch,
  ClientRecord,
  ClientType,
  KycStatus,
  RiskTier,
  SourceOfFunds,
} from '@/domain/types';

const TRUE_LITERAL = 'TRUE';
const FALSE_LITERAL = 'FALSE';

const CSV_FIXTURE_PATH = path.resolve(process.cwd(), '../client_onboarding.csv');

export function loadCsvRecords(): readonly ClientRecord[] {
  const content = readFileSync(CSV_FIXTURE_PATH, 'utf-8');
  const rows = parseCsv(content);
  return rows.map((row) => toClientRecord(row));
}

function toClientRecord(row: Record<string, string>): ClientRecord {
  const annualIncome = Number(readField(row, 'annual_income'));
  if (!Number.isFinite(annualIncome)) {
    throw new Error(`Invalid annual_income for row ${readField(row, 'client_id')}`);
  }
  return {
    clientId: readField(row, 'client_id'),
    branch: readField(row, 'branch') as Branch,
    onboardingDate: readField(row, 'onboarding_date'),
    clientName: readField(row, 'client_name'),
    clientType: readField(row, 'client_type') as ClientType,
    countryOfTaxResidence: readField(row, 'country_of_tax_residence'),
    annualIncome,
    sourceOfFunds: readField(row, 'source_of_funds') as SourceOfFunds,
    pepStatus: parseBoolean(readField(row, 'pep_status')),
    sanctionsScreeningMatch: parseBoolean(readField(row, 'sanctions_screening_match')),
    adverseMediaFlag: parseBoolean(readField(row, 'adverse_media_flag')),
    storedRiskClassification: readField(row, 'risk_classification') as RiskTier,
    kycStatus: readField(row, 'kyc_status') as KycStatus,
    idVerificationDate: emptyToNull(readField(row, 'id_verification_date')),
    relationshipManager: emptyToNull(readField(row, 'relationship_manager')),
    documentationComplete: parseBoolean(readField(row, 'documentation_complete')),
  };
}

function readField(row: Record<string, string>, column: string): string {
  return row[column] ?? '';
}

function parseBoolean(value: string): boolean {
  const normalised = value.trim().toUpperCase();
  if (normalised === TRUE_LITERAL) return true;
  if (normalised === FALSE_LITERAL) return false;
  throw new Error(`Expected ${TRUE_LITERAL} or ${FALSE_LITERAL}, received "${value}"`);
}

function emptyToNull(value: string): string | null {
  return value.trim() === '' ? null : value;
}
