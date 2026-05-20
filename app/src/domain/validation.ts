import { classify } from './rules-engine';
import type { RuleSet } from './rules';
import { DEFAULT_RULES } from './rules';
import type { Result } from './result';
import { err, ok } from './result';
import type {
  AssessmentDraft,
  Branch,
  ClientType,
  KycStatus,
  SourceOfFunds,
} from './types';

export type DraftFieldKey =
  | 'branch'
  | 'clientName'
  | 'clientType'
  | 'countryOfTaxResidence'
  | 'annualIncome'
  | 'sourceOfFunds'
  | 'kycStatus'
  | 'idVerificationDate'
  | 'relationshipManager';

export interface ValidationIssue {
  readonly field: DraftFieldKey | 'workflow';
  readonly message: string;
}

export interface ValidDraft {
  readonly branch: Branch;
  readonly clientName: string;
  readonly clientType: ClientType;
  readonly countryOfTaxResidence: string;
  readonly annualIncome: number;
  readonly sourceOfFunds: SourceOfFunds;
  readonly pepStatus: boolean;
  readonly sanctionsScreeningMatch: boolean;
  readonly adverseMediaFlag: boolean;
  readonly kycStatus: KycStatus;
  readonly idVerificationDate: string | null;
  readonly relationshipManager: string;
  readonly documentationComplete: boolean;
}

function pushIfBlank(
  issues: ValidationIssue[],
  field: DraftFieldKey,
  value: string | null,
  message: string,
): void {
  if (value === null || value.trim() === '') {
    issues.push({ field, message });
  }
}

export function validateDraft(
  draft: AssessmentDraft,
  rules: RuleSet = DEFAULT_RULES,
): Result<ValidDraft, readonly ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  if (draft.branch === null) issues.push({ field: 'branch', message: 'Branch is required' });
  pushIfBlank(issues, 'clientName', draft.clientName, 'Client name is required');
  if (draft.clientType === null)
    issues.push({ field: 'clientType', message: 'Client type is required' });
  pushIfBlank(
    issues,
    'countryOfTaxResidence',
    draft.countryOfTaxResidence,
    'Country of tax residence is required',
  );

  if (draft.annualIncome === null || Number.isNaN(draft.annualIncome)) {
    issues.push({ field: 'annualIncome', message: 'Annual income is required' });
  } else if (draft.annualIncome < 0) {
    issues.push({ field: 'annualIncome', message: 'Annual income cannot be negative' });
  }

  if (draft.sourceOfFunds === null) {
    issues.push({ field: 'sourceOfFunds', message: 'Source of funds is required' });
  }

  pushIfBlank(
    issues,
    'relationshipManager',
    draft.relationshipManager,
    'Relationship manager is required for attribution',
  );

  if (draft.kycStatus === 'APPROVED' && (draft.idVerificationDate === null || draft.idVerificationDate.trim() === '')) {
    issues.push({
      field: 'idVerificationDate',
      message: 'ID verification date is required for APPROVED records',
    });
  }

  if (issues.length > 0) return err(issues);

  const valid: ValidDraft = {
    branch: draft.branch!,
    clientName: draft.clientName.trim(),
    clientType: draft.clientType!,
    countryOfTaxResidence: draft.countryOfTaxResidence.trim(),
    annualIncome: draft.annualIncome!,
    sourceOfFunds: draft.sourceOfFunds!,
    pepStatus: draft.pepStatus,
    sanctionsScreeningMatch: draft.sanctionsScreeningMatch,
    adverseMediaFlag: draft.adverseMediaFlag,
    kycStatus: draft.kycStatus,
    idVerificationDate: draft.idVerificationDate,
    relationshipManager: draft.relationshipManager!.trim(),
    documentationComplete: draft.documentationComplete,
  };

  const verdict = classify(valid, rules);
  if (verdict.tier === 'HIGH' && valid.kycStatus === 'APPROVED') {
    return err([
      {
        field: 'workflow',
        message:
          'HIGH-risk clients cannot be APPROVED without Enhanced Due Diligence and senior compliance sign-off. Set KYC status to ENHANCED_DUE_DILIGENCE.',
      },
    ]);
  }

  return ok(valid);
}
