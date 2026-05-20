import { describe, it, expect } from 'vitest';
import { classify } from '@/domain/rules-engine';
import { DEFAULT_RULES } from '@/domain/rules';
import type { RuleSet } from '@/domain/rules';
import { detectFindings } from '@/domain/findings';
import { AssessmentService } from '@/application/assessment-service';
import { FindingsService } from '@/application/findings-service';
import { InMemoryRecordStore } from '@/adapters/in-memory-record-store';
import { loadCsvRecords } from '@/test/csv-fixture';
import type { AssessmentDraft, ClientRecord, Finding } from '@/domain/types';
import type { Clock, ClientIdGenerator, IdGenerator } from '@/domain/ports';

class CountingAmendmentIds implements IdGenerator {
  private counter = 0;
  next(): string {
    this.counter += 1;
    return `a-${this.counter}`;
  }
}

class FixedClock implements Clock {
  private readonly fixed: Date;
  constructor(fixed: Date) {
    this.fixed = fixed;
  }
  now(): Date {
    return this.fixed;
  }
}

class FixedIdGenerator implements ClientIdGenerator {
  private readonly id: string;
  constructor(id: string) {
    this.id = id;
  }
  nextClientId(): string {
    return this.id;
  }
}

function buildSubject(overrides: Partial<ClientRecord> = {}): Pick<
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
> {
  return {
    branch: 'Mayfair',
    clientName: 'Test',
    clientType: 'INDIVIDUAL',
    countryOfTaxResidence: 'Netherlands',
    annualIncome: 80_000,
    sourceOfFunds: 'Employment',
    pepStatus: false,
    sanctionsScreeningMatch: false,
    adverseMediaFlag: false,
    ...overrides,
  };
}

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

const seededRecords = loadCsvRecords();
const seededFindings = detectFindings(seededRecords);

function findingsForClient(findings: readonly Finding[], clientId: string): readonly Finding[] {
  return findings.filter((finding) => finding.clientId === clientId);
}

describe('Section 2 — Rules engine', () => {
  it('R2.1: HIGH fires when pep_status is TRUE', () => {
    const verdict = classify(buildSubject({ pepStatus: true }));
    expect(verdict.tier).toBe('HIGH');
    expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('high.pep');
  });

  it('R2.2: HIGH fires when sanctions_screening_match is TRUE', () => {
    const verdict = classify(buildSubject({ sanctionsScreeningMatch: true }));
    expect(verdict.tier).toBe('HIGH');
    expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('high.sanctions');
  });

  it('R2.3: HIGH fires when adverse_media_flag is TRUE', () => {
    const verdict = classify(buildSubject({ adverseMediaFlag: true }));
    expect(verdict.tier).toBe('HIGH');
    expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('high.adverse-media');
  });

  it.each(['Russia', 'Belarus', 'Venezuela'])(
    'R2.4: HIGH fires when country of tax residence is %s',
    (country) => {
      const verdict = classify(buildSubject({ countryOfTaxResidence: country }));
      expect(verdict.tier).toBe('HIGH');
      expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('high.country');
    },
  );

  it('R2.7: MEDIUM fires for income > 500,000 AND source ∈ {Inheritance, Gift, Other}', () => {
    const verdict = classify(buildSubject({ annualIncome: 750_000, sourceOfFunds: 'Gift' }));
    expect(verdict.tier).toBe('MEDIUM');
    expect(verdict.firedRules.map((rule) => rule.ruleId)).toContain('medium.income-source');
  });

  it('R2.9: highest applicable tier wins when multiple rules fire (HIGH beats MEDIUM, both retained)', () => {
    const verdict = classify(
      buildSubject({ pepStatus: true, clientType: 'ENTITY' }),
    );
    expect(verdict.tier).toBe('HIGH');
    const ruleIds = verdict.firedRules.map((rule) => rule.ruleId);
    expect(ruleIds).toContain('high.pep');
    expect(ruleIds).toContain('medium.entity');
  });
});

describe('Section 3 — Findings detection', () => {
  it('R3.6: CLT-005 is flagged as a classification mismatch (PEP=TRUE stored LOW, expected HIGH)', () => {
    const mismatch = findingsForClient(seededFindings, 'CLT-005').find(
      (finding) => finding.severity === 'CLASSIFICATION_MISMATCH',
    );
    expect(mismatch).toBeDefined();
  });

  it('R3.7: CLT-017 is flagged as a classification mismatch (Russia + PEP, stored LOW)', () => {
    const mismatch = findingsForClient(seededFindings, 'CLT-017').find(
      (finding) => finding.severity === 'CLASSIFICATION_MISMATCH',
    );
    expect(mismatch).toBeDefined();
  });

  it('R3.8: CLT-031 is flagged as a classification mismatch (China + adverse media, stored LOW)', () => {
    const mismatch = findingsForClient(seededFindings, 'CLT-031').find(
      (finding) => finding.severity === 'CLASSIFICATION_MISMATCH',
    );
    expect(mismatch).toBeDefined();
  });

  it('R3.9: CLT-012 has a missing relationship_manager finding', () => {
    const missing = findingsForClient(seededFindings, 'CLT-012').find(
      (finding) => finding.severity === 'MISSING_FIELD' && finding.detail.includes('relationship_manager'),
    );
    expect(missing).toBeDefined();
  });

  it('R3.10: CLT-027 has a missing relationship_manager finding', () => {
    const missing = findingsForClient(seededFindings, 'CLT-027').find(
      (finding) => finding.severity === 'MISSING_FIELD' && finding.detail.includes('relationship_manager'),
    );
    expect(missing).toBeDefined();
  });

  it('R3.11: CLT-042 has a missing relationship_manager finding', () => {
    const missing = findingsForClient(seededFindings, 'CLT-042').find(
      (finding) => finding.severity === 'MISSING_FIELD' && finding.detail.includes('relationship_manager'),
    );
    expect(missing).toBeDefined();
  });

  it('R3.12: CLT-031 has a missing id_verification_date finding (APPROVED without ID date)', () => {
    const missing = findingsForClient(seededFindings, 'CLT-031').find(
      (finding) => finding.severity === 'MISSING_FIELD' && finding.detail.includes('id_verification_date'),
    );
    expect(missing).toBeDefined();
  });

  it('R3.13: CLT-039 has a missing id_verification_date finding (APPROVED without ID date)', () => {
    const missing = findingsForClient(seededFindings, 'CLT-039').find(
      (finding) => finding.severity === 'MISSING_FIELD' && finding.detail.includes('id_verification_date'),
    );
    expect(missing).toBeDefined();
  });

  it('R3.14: CLT-023 is flagged as a workflow violation (HIGH from Venezuela + APPROVED)', () => {
    const violation = findingsForClient(seededFindings, 'CLT-023').find(
      (finding) => finding.severity === 'WORKFLOW_VIOLATION',
    );
    expect(violation).toBeDefined();
  });
});

describe('Section 4 — Intake validation', () => {
  function buildService(): { service: AssessmentService; store: InMemoryRecordStore } {
    const store = new InMemoryRecordStore();
    const service = new AssessmentService({
      recordStore: store,
      clock: new FixedClock(new Date('2026-05-20T12:00:00.000Z')),
      clientIdGenerator: new FixedIdGenerator('CLT-999'),
      amendmentIdGenerator: new CountingAmendmentIds(),
      rules: DEFAULT_RULES,
      currentAssessor: 'R. Patel',
    });
    return { service, store };
  }

  it('R4.12: the stored classification is derived by the rules engine, not entered by the RM', () => {
    const { service, store } = buildService();
    service.submit(buildDraft({ pepStatus: true, kycStatus: 'ENHANCED_DUE_DILIGENCE' }));
    const stored = store.get('CLT-999');
    expect(stored?.storedRiskClassification).toBe('HIGH');
  });

  it('R4.14: submit is blocked when required fields are missing', () => {
    const { service } = buildService();
    const result = service.submit(buildDraft({ clientName: '', relationshipManager: null }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const fields = result.error.map((issue) => issue.field);
      expect(fields).toContain('clientName');
      expect(fields).toContain('relationshipManager');
    }
  });

  it('R4.15: submit is blocked when derived tier is HIGH and kyc_status is APPROVED', () => {
    const { service } = buildService();
    const result = service.submit(buildDraft({ pepStatus: true, kycStatus: 'APPROVED' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.map((issue) => issue.field)).toContain('workflow');
    }
  });
});

describe('Section 8 — Compliance semantics', () => {
  it('R8.2: every newly-added record carries assessedBy and assessedAt', () => {
    const store = new InMemoryRecordStore();
    const fixedDate = new Date('2026-05-20T09:30:00.000Z');
    const service = new AssessmentService({
      recordStore: store,
      clock: new FixedClock(fixedDate),
      clientIdGenerator: new FixedIdGenerator('CLT-500'),
      amendmentIdGenerator: new CountingAmendmentIds(),
      rules: DEFAULT_RULES,
      currentAssessor: 'A. Kovacs',
    });
    service.submit(buildDraft());
    const stored = store.get('CLT-500');
    expect(stored?.assessedBy).toBe('A. Kovacs');
    expect(stored?.assessedAt).toBe(fixedDate.toISOString());
  });
});

describe('Section 11 — Architecture seams', () => {
  it('R11.1: the rules engine is a pure function — passing an alternate RuleSet produces a different verdict', () => {
    const alternateRules: RuleSet = {
      version: 'test.alternate',
      effectiveFrom: '2026-01-01',
      predicates: [
        {
          id: 'high.netherlands',
          tier: 'HIGH',
          label: 'Test: Netherlands is HIGH',
          when: { field: 'countryOfTaxResidence', eq: 'Netherlands' },
        },
      ],
      requiredActionsByTier: {
        HIGH: ['Test action'],
        MEDIUM: [],
        LOW: [],
      },
    };
    const subject = buildSubject({ countryOfTaxResidence: 'Netherlands' });
    const defaultVerdict = classify(subject, DEFAULT_RULES);
    const alternateVerdict = classify(subject, alternateRules);
    expect(defaultVerdict.tier).toBe('LOW');
    expect(alternateVerdict.tier).toBe('HIGH');
    expect(alternateVerdict.rulesVersion).toBe('test.alternate');
  });
});

describe('Section 5 + Section 6 — integration sanity', () => {
  it('FindingsService produces the same set of findings as detectFindings over the seeded store', () => {
    const store = new InMemoryRecordStore();
    store.seed(seededRecords);
    const service = new FindingsService({ recordStore: store, rules: DEFAULT_RULES });
    expect(service.allFindings()).toHaveLength(seededFindings.length);
  });
});
