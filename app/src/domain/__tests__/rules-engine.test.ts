import { describe, it, expect } from 'vitest';
import { classify } from '@/domain/rules-engine';
import { DEFAULT_RULES } from '@/domain/rules';
import type {
  Branch,
  ClientRecord,
  ClientType,
  SourceOfFunds,
} from '@/domain/types';

type Subject = Pick<
  ClientRecord,
  | 'branch'
  | 'clientName'
  | 'clientType'
  | 'countryOfTaxResidence'
  | 'annualIncome'
  | 'sourceOfFunds'
  | 'pepStatus'
  | 'sanctionsScreeningMatch'
  | 'adverseMediaFlag'
>;

function buildSubject(overrides: Partial<Subject> = {}): Subject {
  return {
    branch: 'Mayfair' as Branch,
    clientName: 'Test Client',
    clientType: 'INDIVIDUAL' as ClientType,
    countryOfTaxResidence: 'Netherlands',
    annualIncome: 80_000,
    sourceOfFunds: 'Employment' as SourceOfFunds,
    pepStatus: false,
    sanctionsScreeningMatch: false,
    adverseMediaFlag: false,
    ...overrides,
  };
}

describe('classify — LOW baseline', () => {
  it('returns LOW with no fired rules for a clean individual', () => {
    const verdict = classify(buildSubject());
    expect(verdict.tier).toBe('LOW');
    expect(verdict.firedRules).toHaveLength(0);
    expect(verdict.requiredActions).toEqual([]);
  });
});

describe('classify — HIGH triggers', () => {
  it('returns HIGH when pepStatus is true', () => {
    const verdict = classify(buildSubject({ pepStatus: true }));
    expect(verdict.tier).toBe('HIGH');
    expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('high.pep');
  });

  it('returns HIGH when sanctionsScreeningMatch is true', () => {
    const verdict = classify(buildSubject({ sanctionsScreeningMatch: true }));
    expect(verdict.tier).toBe('HIGH');
    expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('high.sanctions');
  });

  it('returns HIGH when adverseMediaFlag is true', () => {
    const verdict = classify(buildSubject({ adverseMediaFlag: true }));
    expect(verdict.tier).toBe('HIGH');
    expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('high.adverse-media');
  });

  it.each(['Russia', 'Belarus', 'Venezuela'])(
    'returns HIGH when country is %s',
    (country) => {
      const verdict = classify(buildSubject({ countryOfTaxResidence: country }));
      expect(verdict.tier).toBe('HIGH');
      expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('high.country');
    },
  );
});

describe('classify — MEDIUM triggers', () => {
  it('returns MEDIUM when client type is ENTITY', () => {
    const verdict = classify(buildSubject({ clientType: 'ENTITY' }));
    expect(verdict.tier).toBe('MEDIUM');
    expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('medium.entity');
  });

  it('returns LOW for INDIVIDUAL control case (ENTITY rule does not fire)', () => {
    const verdict = classify(buildSubject({ clientType: 'INDIVIDUAL' }));
    expect(verdict.tier).toBe('LOW');
    expect(verdict.firedRules.map((rule) => rule.ruleId)).not.toContain('medium.entity');
  });

  it.each(['Brazil', 'Turkey', 'South Africa', 'Mexico', 'UAE', 'China'])(
    'returns MEDIUM when country is %s',
    (country) => {
      const verdict = classify(buildSubject({ countryOfTaxResidence: country }));
      expect(verdict.tier).toBe('MEDIUM');
      expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('medium.country');
    },
  );
});

describe('classify — compound income rule', () => {
  it.each(['Inheritance', 'Gift', 'Other'] as const)(
    'fires MEDIUM for %s when income exceeds the threshold',
    (source) => {
      const verdict = classify(
        buildSubject({ annualIncome: 750_000, sourceOfFunds: source }),
      );
      expect(verdict.tier).toBe('MEDIUM');
      expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('medium.income-source');
    },
  );

  it('does NOT fire at exactly 500,000 (strict greater-than)', () => {
    const verdict = classify(
      buildSubject({ annualIncome: 500_000, sourceOfFunds: 'Inheritance' }),
    );
    expect(verdict.tier).toBe('LOW');
    expect(verdict.firedRules.map((rule) => rule.ruleId)).not.toContain('medium.income-source');
  });

  it('fires at 500,001 (one above the threshold)', () => {
    const verdict = classify(
      buildSubject({ annualIncome: 500_001, sourceOfFunds: 'Inheritance' }),
    );
    expect(verdict.tier).toBe('MEDIUM');
    expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('medium.income-source');
  });

  it.each([
    'Pension',
    'Property Sale',
    'Employment',
    'Business Income',
    'Investment Returns',
  ] as const)(
    'does NOT fire for %s even with income above the threshold',
    (source) => {
      const verdict = classify(
        buildSubject({ annualIncome: 2_000_000, sourceOfFunds: source }),
      );
      expect(verdict.firedRules.map((rule) => rule.ruleId)).not.toContain(
        'medium.income-source',
      );
    },
  );
});

describe('classify — highest-tier-wins', () => {
  it('returns HIGH when both HIGH and MEDIUM rules trigger, retaining both in firedRules', () => {
    const verdict = classify(
      buildSubject({
        pepStatus: true,
        clientType: 'ENTITY',
      }),
    );
    expect(verdict.tier).toBe('HIGH');
    const firedRuleIds = verdict.firedRules.map((rule) => rule.ruleId);
    expect(firedRuleIds).toContain('high.pep');
    expect(firedRuleIds).toContain('medium.entity');
  });
});

describe('classify — verdict metadata', () => {
  it('echoes the input ruleset version', () => {
    const verdict = classify(buildSubject(), DEFAULT_RULES);
    expect(verdict.rulesVersion).toBe(DEFAULT_RULES.version);
  });
});
