import { describe, it, expect } from 'vitest';
import { validateDraft } from '@/domain/validation';
import type { AssessmentDraft } from '@/domain/types';

function buildDraft(overrides: Partial<AssessmentDraft> = {}): AssessmentDraft {
  return {
    branch: 'Mayfair',
    clientName: 'Valid Client',
    clientType: 'INDIVIDUAL',
    countryOfTaxResidence: 'Netherlands',
    annualIncome: 80_000,
    sourceOfFunds: 'Employment',
    pepStatus: false,
    sanctionsScreeningMatch: false,
    adverseMediaFlag: false,
    kycStatus: 'APPROVED',
    idVerificationDate: '2024-10-14',
    relationshipManager: 'R. Patel',
    documentationComplete: true,
    ...overrides,
  };
}

function fieldsOf(result: ReturnType<typeof validateDraft>): readonly string[] {
  return result.ok ? [] : result.error.map((issue) => issue.field);
}

describe('validateDraft — happy path', () => {
  it('returns ok for a complete, valid LOW-risk INDIVIDUAL draft', () => {
    const result = validateDraft(buildDraft());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.clientName).toBe('Valid Client');
      expect(result.value.relationshipManager).toBe('R. Patel');
    }
  });
});

describe('validateDraft — required fields', () => {
  it('returns err with a branch issue when branch is null', () => {
    const result = validateDraft(buildDraft({ branch: null }));
    expect(fieldsOf(result)).toContain('branch');
  });

  it('returns err with a clientName issue when name is blank', () => {
    const result = validateDraft(buildDraft({ clientName: '' }));
    expect(fieldsOf(result)).toContain('clientName');
  });

  it('returns err with a clientName issue when name is whitespace-only', () => {
    const result = validateDraft(buildDraft({ clientName: '   ' }));
    expect(fieldsOf(result)).toContain('clientName');
  });
});

describe('validateDraft — annual income', () => {
  it('returns err with an annualIncome issue when income is null', () => {
    const result = validateDraft(buildDraft({ annualIncome: null }));
    expect(fieldsOf(result)).toContain('annualIncome');
  });

  it('returns err with an annualIncome issue when income is negative', () => {
    const result = validateDraft(buildDraft({ annualIncome: -1 }));
    expect(fieldsOf(result)).toContain('annualIncome');
  });
});

describe('validateDraft — KYC conditional id verification', () => {
  it('returns err with an idVerificationDate issue when APPROVED has no verification date', () => {
    const result = validateDraft(
      buildDraft({ kycStatus: 'APPROVED', idVerificationDate: null }),
    );
    expect(fieldsOf(result)).toContain('idVerificationDate');
  });
});

describe('validateDraft — HIGH-risk workflow guard', () => {
  it('returns err with a workflow issue when a HIGH draft is APPROVED', () => {
    const result = validateDraft(
      buildDraft({
        pepStatus: true,
        kycStatus: 'APPROVED',
        idVerificationDate: '2024-10-14',
      }),
    );
    expect(fieldsOf(result)).toContain('workflow');
  });

  it('returns ok for the same HIGH draft when KYC is ENHANCED_DUE_DILIGENCE', () => {
    const result = validateDraft(
      buildDraft({
        pepStatus: true,
        kycStatus: 'ENHANCED_DUE_DILIGENCE',
        idVerificationDate: '2024-10-14',
      }),
    );
    expect(result.ok).toBe(true);
  });
});
