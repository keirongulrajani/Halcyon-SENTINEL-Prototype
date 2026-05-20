import type { Result } from '@/domain/result';
import { err, ok } from '@/domain/result';
import {
  ALL_BRANCHES,
  ALL_CLIENT_TYPES,
  ALL_KYC_STATUSES,
  ALL_RISK_TIERS,
  ALL_SOURCES_OF_FUNDS,
} from '@/domain/types';
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

export const REQUIRED_CSV_HEADERS = [
  'client_id',
  'branch',
  'onboarding_date',
  'client_name',
  'client_type',
  'country_of_tax_residence',
  'annual_income',
  'source_of_funds',
  'pep_status',
  'sanctions_screening_match',
  'adverse_media_flag',
  'risk_classification',
  'kyc_status',
  'id_verification_date',
  'relationship_manager',
  'documentation_complete',
] as const;

export interface RowMappingIssue {
  readonly field: string;
  readonly message: string;
}

function readField(row: Record<string, string>, column: string): string {
  return (row[column] ?? '').trim();
}

function parseBooleanOrIssue(
  value: string,
  field: string,
  issues: RowMappingIssue[],
): boolean | null {
  const normalised = value.trim().toUpperCase();
  if (normalised === TRUE_LITERAL) return true;
  if (normalised === FALSE_LITERAL) return false;
  issues.push({ field, message: `Expected TRUE or FALSE, got "${value}"` });
  return null;
}

function parseNumberOrIssue(
  value: string,
  field: string,
  issues: RowMappingIssue[],
): number | null {
  if (value.trim() === '') {
    issues.push({ field, message: 'Required numeric field is empty' });
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    issues.push({ field, message: `Expected a number, got "${value}"` });
    return null;
  }
  if (parsed < 0) {
    issues.push({ field, message: 'Value cannot be negative' });
    return null;
  }
  return parsed;
}

function parseEnumOrIssue<T extends string>(
  value: string,
  allowed: readonly T[],
  field: string,
  issues: RowMappingIssue[],
): T | null {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  issues.push({
    field,
    message: `"${value}" is not one of: ${allowed.join(', ')}`,
  });
  return null;
}

function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}

export function findMissingHeaders(
  presentHeaders: readonly string[],
): readonly string[] {
  const present = new Set(presentHeaders);
  return REQUIRED_CSV_HEADERS.filter((header) => !present.has(header));
}

export function mapRowToClientRecord(
  row: Record<string, string>,
): Result<ClientRecord, readonly RowMappingIssue[]> {
  const issues: RowMappingIssue[] = [];

  const clientId = readField(row, 'client_id');
  if (clientId === '') issues.push({ field: 'client_id', message: 'client_id is required' });

  const branch = parseEnumOrIssue<Branch>(readField(row, 'branch'), ALL_BRANCHES, 'branch', issues);
  const clientType = parseEnumOrIssue<ClientType>(
    readField(row, 'client_type'),
    ALL_CLIENT_TYPES,
    'client_type',
    issues,
  );
  const sourceOfFunds = parseEnumOrIssue<SourceOfFunds>(
    readField(row, 'source_of_funds'),
    ALL_SOURCES_OF_FUNDS,
    'source_of_funds',
    issues,
  );
  const storedRiskClassification = parseEnumOrIssue<RiskTier>(
    readField(row, 'risk_classification'),
    ALL_RISK_TIERS,
    'risk_classification',
    issues,
  );
  const kycStatus = parseEnumOrIssue<KycStatus>(
    readField(row, 'kyc_status'),
    ALL_KYC_STATUSES,
    'kyc_status',
    issues,
  );

  const annualIncome = parseNumberOrIssue(readField(row, 'annual_income'), 'annual_income', issues);
  const pepStatus = parseBooleanOrIssue(readField(row, 'pep_status'), 'pep_status', issues);
  const sanctionsScreeningMatch = parseBooleanOrIssue(
    readField(row, 'sanctions_screening_match'),
    'sanctions_screening_match',
    issues,
  );
  const adverseMediaFlag = parseBooleanOrIssue(
    readField(row, 'adverse_media_flag'),
    'adverse_media_flag',
    issues,
  );
  const documentationComplete = parseBooleanOrIssue(
    readField(row, 'documentation_complete'),
    'documentation_complete',
    issues,
  );

  const onboardingDate = readField(row, 'onboarding_date');
  const clientName = readField(row, 'client_name');
  const countryOfTaxResidence = readField(row, 'country_of_tax_residence');

  if (onboardingDate === '') issues.push({ field: 'onboarding_date', message: 'onboarding_date is required' });
  if (clientName === '') issues.push({ field: 'client_name', message: 'client_name is required' });
  if (countryOfTaxResidence === '')
    issues.push({ field: 'country_of_tax_residence', message: 'country_of_tax_residence is required' });

  if (issues.length > 0) return err(issues);

  return ok({
    clientId,
    branch: branch!,
    onboardingDate,
    clientName,
    clientType: clientType!,
    countryOfTaxResidence,
    annualIncome: annualIncome!,
    sourceOfFunds: sourceOfFunds!,
    pepStatus: pepStatus!,
    sanctionsScreeningMatch: sanctionsScreeningMatch!,
    adverseMediaFlag: adverseMediaFlag!,
    storedRiskClassification: storedRiskClassification!,
    kycStatus: kycStatus!,
    idVerificationDate: emptyToNull(readField(row, 'id_verification_date')),
    relationshipManager: emptyToNull(readField(row, 'relationship_manager')),
    documentationComplete: documentationComplete!,
  });
}
