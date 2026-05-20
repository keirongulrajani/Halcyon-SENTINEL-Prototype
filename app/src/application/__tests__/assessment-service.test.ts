import { describe, it, expect } from 'vitest';
import { AssessmentService } from '@/application/assessment-service';
import { InMemoryRecordStore } from '@/adapters/in-memory-record-store';
import { DEFAULT_RULES } from '@/domain/rules';
import { EMPTY_DRAFT } from '@/domain/types';
import type { AssessmentDraft } from '@/domain/types';
import type { Clock, ClientIdGenerator, IdGenerator } from '@/domain/ports';

class FakeClock implements Clock {
  private readonly fixed: Date;
  constructor(fixed: Date) {
    this.fixed = fixed;
  }
  now(): Date {
    return this.fixed;
  }
}

class FakeIdGenerator implements ClientIdGenerator {
  private readonly id: string;
  constructor(id: string) {
    this.id = id;
  }
  nextClientId(): string {
    return this.id;
  }
}

class CountingIdGenerator implements IdGenerator {
  private counter = 0;
  next(): string {
    this.counter += 1;
    return `amend-${this.counter}`;
  }
}

const FIXED_DATE = new Date('2026-05-20T12:34:56.000Z');
const FIXED_ASSESSOR = 'R. Patel';
const FIXED_CLIENT_ID = 'CLT-999';

function buildService(): { service: AssessmentService; store: InMemoryRecordStore } {
  const store = new InMemoryRecordStore();
  const service = new AssessmentService({
    recordStore: store,
    clock: new FakeClock(FIXED_DATE),
    clientIdGenerator: new FakeIdGenerator(FIXED_CLIENT_ID),
    amendmentIdGenerator: new CountingIdGenerator(),
    rules: DEFAULT_RULES,
    currentAssessor: FIXED_ASSESSOR,
  });
  return { service, store };
}

function buildDraft(overrides: Partial<AssessmentDraft> = {}): AssessmentDraft {
  return {
    branch: 'Mayfair',
    clientName: 'Sample Client',
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

describe('AssessmentService.preview', () => {
  it('R4.13: returns a Verdict whose tier is LOW for a default INDIVIDUAL with no flags', () => {
    const { service } = buildService();
    const verdict = service.preview(buildDraft());
    expect(verdict.tier).toBe('LOW');
    expect(verdict.firedRules).toHaveLength(0);
  });

  it('R4.13: returns a HIGH verdict with the pep rule fired when pepStatus is true', () => {
    const { service } = buildService();
    const verdict = service.preview(buildDraft({ pepStatus: true }));
    expect(verdict.tier).toBe('HIGH');
    expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('high.pep');
  });

  it('R4.13: returns a MEDIUM verdict with the entity rule fired for an ENTITY draft', () => {
    const { service } = buildService();
    const verdict = service.preview(buildDraft({ clientType: 'ENTITY' }));
    expect(verdict.tier).toBe('MEDIUM');
    expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('medium.entity');
  });
});

describe('AssessmentService.submit', () => {
  it('R4.14: returns err with required-field issues when the draft is empty', () => {
    const { service } = buildService();
    const result = service.submit(EMPTY_DRAFT);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const fields = result.error.map((issue) => issue.field);
      expect(fields).toContain('branch');
      expect(fields).toContain('clientName');
      expect(fields).toContain('clientType');
      expect(fields).toContain('countryOfTaxResidence');
      expect(fields).toContain('annualIncome');
      expect(fields).toContain('sourceOfFunds');
      expect(fields).toContain('relationshipManager');
    }
  });

  it("R4.15: returns err with a 'workflow' issue when the draft would classify HIGH and kycStatus is APPROVED", () => {
    const { service } = buildService();
    const result = service.submit(
      buildDraft({ pepStatus: true, kycStatus: 'APPROVED', idVerificationDate: '2024-10-14' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.map((issue) => issue.field)).toContain('workflow');
    }
  });

  it('R4.15: succeeds for the same HIGH-classified draft when kycStatus is ENHANCED_DUE_DILIGENCE', () => {
    const { service } = buildService();
    const result = service.submit(
      buildDraft({ pepStatus: true, kycStatus: 'ENHANCED_DUE_DILIGENCE' }),
    );
    expect(result.ok).toBe(true);
  });

  it('R4.12: persists the record with storedRiskClassification computed by the rules engine (not from the draft)', () => {
    const { service, store } = buildService();
    const result = service.submit(
      buildDraft({ pepStatus: true, kycStatus: 'ENHANCED_DUE_DILIGENCE' }),
    );
    expect(result.ok).toBe(true);
    const stored = store.get(FIXED_CLIENT_ID);
    expect(stored?.storedRiskClassification).toBe('HIGH');
  });

  it('R4.16: stamps assessedBy, assessedAt, rulesVersion, and firedRuleIds on the new record', () => {
    const { service, store } = buildService();
    const result = service.submit(buildDraft({ pepStatus: true, kycStatus: 'ENHANCED_DUE_DILIGENCE' }));
    expect(result.ok).toBe(true);
    const stored = store.get(FIXED_CLIENT_ID);
    expect(stored?.assessedBy).toBe(FIXED_ASSESSOR);
    expect(stored?.assessedAt).toBe(FIXED_DATE.toISOString());
    expect(stored?.rulesVersion).toBe(DEFAULT_RULES.version);
    expect(stored?.firedRuleIds).toContain('high.pep');
  });

  it("R8.2: uses the clock's now() for assessedAt and the configured currentAssessor for assessedBy", () => {
    const { service, store } = buildService();
    service.submit(buildDraft());
    const stored = store.get(FIXED_CLIENT_ID);
    expect(stored?.assessedAt).toBe(FIXED_DATE.toISOString());
    expect(stored?.assessedBy).toBe(FIXED_ASSESSOR);
  });

  it('R4.16: generates a clientId via the configured ClientIdGenerator', () => {
    const { service, store } = buildService();
    service.submit(buildDraft());
    expect(store.get(FIXED_CLIENT_ID)).not.toBeNull();
  });

  it('R5.1: adds the record to the store (list increases by 1)', () => {
    const { service, store } = buildService();
    const before = store.list().length;
    service.submit(buildDraft());
    expect(store.list().length).toBe(before + 1);
  });
});
