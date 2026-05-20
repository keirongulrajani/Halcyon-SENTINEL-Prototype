export type Branch = 'Mayfair' | 'Edinburgh' | 'Manchester' | 'Canary Wharf';

export const ALL_BRANCHES: readonly Branch[] = [
  'Mayfair',
  'Edinburgh',
  'Manchester',
  'Canary Wharf',
] as const;

export type ClientType = 'INDIVIDUAL' | 'ENTITY';

export const ALL_CLIENT_TYPES: readonly ClientType[] = ['INDIVIDUAL', 'ENTITY'] as const;

export type SourceOfFunds =
  | 'Employment'
  | 'Business Income'
  | 'Investment Returns'
  | 'Inheritance'
  | 'Property Sale'
  | 'Pension'
  | 'Gift'
  | 'Other';

export const ALL_SOURCES_OF_FUNDS: readonly SourceOfFunds[] = [
  'Employment',
  'Business Income',
  'Investment Returns',
  'Inheritance',
  'Property Sale',
  'Pension',
  'Gift',
  'Other',
] as const;

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH';

export const ALL_RISK_TIERS: readonly RiskTier[] = ['LOW', 'MEDIUM', 'HIGH'] as const;

export type KycStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'ENHANCED_DUE_DILIGENCE';

export const ALL_KYC_STATUSES: readonly KycStatus[] = [
  'APPROVED',
  'PENDING',
  'REJECTED',
  'ENHANCED_DUE_DILIGENCE',
] as const;

export interface ClientRecord {
  readonly clientId: string;
  readonly branch: Branch;
  readonly onboardingDate: string;
  readonly clientName: string;
  readonly clientType: ClientType;
  readonly countryOfTaxResidence: string;
  readonly annualIncome: number;
  readonly sourceOfFunds: SourceOfFunds;
  readonly pepStatus: boolean;
  readonly sanctionsScreeningMatch: boolean;
  readonly adverseMediaFlag: boolean;
  readonly storedRiskClassification: RiskTier;
  readonly kycStatus: KycStatus;
  readonly idVerificationDate: string | null;
  readonly relationshipManager: string | null;
  readonly documentationComplete: boolean;
  readonly assessedBy?: string;
  readonly assessedAt?: string;
  readonly rulesVersion?: string;
  readonly firedRuleIds?: readonly string[];
  readonly supersedes?: string;
  readonly supersededBy?: string;
  readonly amendments?: readonly AmendmentEntry[];
}

export interface AmendmentEntry {
  readonly id: string;
  readonly at: string;
  readonly actor: string;
  readonly reason: string;
  readonly changes: readonly WorkflowStateChange[];
}

export interface WorkflowStateChange {
  readonly field: 'kycStatus' | 'idVerificationDate' | 'documentationComplete' | 'relationshipManager';
  readonly previousValue: string | boolean | null;
  readonly newValue: string | boolean | null;
}

export interface WorkflowStatePatch {
  readonly kycStatus?: KycStatus;
  readonly idVerificationDate?: string | null;
  readonly documentationComplete?: boolean;
  readonly relationshipManager?: string;
}

export interface FiredRule {
  readonly ruleId: string;
  readonly predicateLabel: string;
  readonly tier: RiskTier;
}

export interface Verdict {
  readonly tier: RiskTier;
  readonly firedRules: readonly FiredRule[];
  readonly requiredActions: readonly string[];
  readonly rulesVersion: string;
}

export type FindingSeverity =
  | 'CLASSIFICATION_MISMATCH'
  | 'WORKFLOW_VIOLATION'
  | 'MISSING_FIELD';

export interface Finding {
  readonly id: string;
  readonly clientId: string;
  readonly severity: FindingSeverity;
  readonly rule: string;
  readonly detail: string;
  readonly recommendedAction: string;
}

export interface AssessmentDraft {
  readonly branch: Branch | null;
  readonly clientName: string;
  readonly clientType: ClientType | null;
  readonly countryOfTaxResidence: string;
  readonly annualIncome: number | null;
  readonly sourceOfFunds: SourceOfFunds | null;
  readonly pepStatus: boolean;
  readonly sanctionsScreeningMatch: boolean;
  readonly adverseMediaFlag: boolean;
  readonly kycStatus: KycStatus;
  readonly idVerificationDate: string | null;
  readonly relationshipManager: string | null;
  readonly documentationComplete: boolean;
}

export const EMPTY_DRAFT: AssessmentDraft = {
  branch: null,
  clientName: '',
  clientType: null,
  countryOfTaxResidence: '',
  annualIncome: null,
  sourceOfFunds: null,
  pepStatus: false,
  sanctionsScreeningMatch: false,
  adverseMediaFlag: false,
  kycStatus: 'PENDING',
  idVerificationDate: null,
  relationshipManager: null,
  documentationComplete: false,
};
