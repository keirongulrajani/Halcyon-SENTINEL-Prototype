import { describe, it, expect } from 'vitest';
import { AssessmentService } from '@/application/assessment-service';
import { InMemoryRecordStore } from '@/adapters/in-memory-record-store';
import { DEFAULT_RULES } from '@/domain/rules';
import { EMPTY_DRAFT } from '@/domain/types';
import type { AssessmentDraft, ClientRecord } from '@/domain/types';
import type { Clock, ClientIdGenerator, IdGenerator } from '@/domain/ports';

class FixedClock implements Clock {
  private readonly fixed: Date;
  constructor(fixed: Date) {
    this.fixed = fixed;
  }
  now(): Date {
    return this.fixed;
  }
}

class SequentialFakeClientIds implements ClientIdGenerator {
  private counter = 0;
  nextClientId(): string {
    this.counter += 1;
    return `CLT-${this.counter.toString().padStart(3, '0')}`;
  }
}

class CountingAmendmentIds implements IdGenerator {
  private counter = 0;
  next(): string {
    this.counter += 1;
    return `amend-${this.counter}`;
  }
}

const ORIGINAL_ASSESSOR = 'R. Patel';
const FIXED_DATE = new Date('2026-05-20T12:00:00.000Z');

function buildSetup(): { service: AssessmentService; store: InMemoryRecordStore } {
  const store = new InMemoryRecordStore();
  const service = new AssessmentService({
    recordStore: store,
    clock: new FixedClock(FIXED_DATE),
    clientIdGenerator: new SequentialFakeClientIds(),
    amendmentIdGenerator: new CountingAmendmentIds(),
    rules: DEFAULT_RULES,
    currentAssessor: ORIGINAL_ASSESSOR,
  });
  return { service, store };
}

function buildValidDraft(overrides: Partial<AssessmentDraft> = {}): AssessmentDraft {
  return {
    ...EMPTY_DRAFT,
    branch: 'Mayfair',
    clientName: 'Sample Client',
    clientType: 'INDIVIDUAL',
    countryOfTaxResidence: 'Netherlands',
    annualIncome: 60_000,
    sourceOfFunds: 'Employment',
    pepStatus: false,
    sanctionsScreeningMatch: false,
    adverseMediaFlag: false,
    kycStatus: 'PENDING',
    idVerificationDate: null,
    relationshipManager: 'R. Patel',
    documentationComplete: true,
    ...overrides,
  };
}

describe('AssessmentService.submit with supersede context', () => {
  it('R7.5+: creates a new record with supersedes pointer and marks the original supersededBy', () => {
    const { service, store } = buildSetup();
    const firstSubmit = service.submit(buildValidDraft());
    expect(firstSubmit.ok).toBe(true);
    if (!firstSubmit.ok) return;
    const originalClientId = firstSubmit.value.clientId;

    const supersedingResult = service.submit(
      buildValidDraft({ pepStatus: true, kycStatus: 'ENHANCED_DUE_DILIGENCE' }),
      { originalClientId, reason: 'Adverse media surfaced post-intake' },
    );
    expect(supersedingResult.ok).toBe(true);
    if (!supersedingResult.ok) return;

    expect(supersedingResult.value.supersedes).toBe(originalClientId);
    expect(supersedingResult.value.storedRiskClassification).toBe('HIGH');

    const originalAfter = store.get(originalClientId);
    expect(originalAfter?.supersededBy).toBe(supersedingResult.value.clientId);
  });

  it('rejects supersede with an empty reason', () => {
    const { service } = buildSetup();
    const firstSubmit = service.submit(buildValidDraft());
    if (!firstSubmit.ok) throw new Error('seed submit failed');

    const result = service.submit(buildValidDraft(), {
      originalClientId: firstSubmit.value.clientId,
      reason: '   ',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.some((issue) => issue.message.includes('reason'))).toBe(true);
  });

  it('rejects superseding a record that has already been superseded', () => {
    const { service } = buildSetup();
    const first = service.submit(buildValidDraft());
    if (!first.ok) throw new Error('seed submit failed');
    const second = service.submit(buildValidDraft(), {
      originalClientId: first.value.clientId,
      reason: 'First supersede',
    });
    if (!second.ok) throw new Error('first supersede failed');

    const third = service.submit(buildValidDraft(), {
      originalClientId: first.value.clientId,
      reason: 'Attempt to supersede already-superseded record',
    });
    expect(third.ok).toBe(false);
  });

  it('rejects supersede when the original record does not exist', () => {
    const { service } = buildSetup();
    const result = service.submit(buildValidDraft(), {
      originalClientId: 'CLT-NOPE',
      reason: 'A reason',
    });
    expect(result.ok).toBe(false);
  });
});

describe('AssessmentService.updateWorkflowState', () => {
  function seedLowRiskRecord(): { service: AssessmentService; record: ClientRecord; store: InMemoryRecordStore } {
    const { service, store } = buildSetup();
    const submission = service.submit(buildValidDraft({ kycStatus: 'PENDING' }));
    if (!submission.ok) throw new Error('seed failed');
    return { service, record: submission.value, store };
  }

  it('writes an amendment entry recording actor, reason, and field changes', () => {
    const { service, record } = seedLowRiskRecord();
    const result = service.updateWorkflowState(
      record.clientId,
      { kycStatus: 'APPROVED', idVerificationDate: '2026-05-20' },
      'ID verified in person',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.kycStatus).toBe('APPROVED');
    expect(result.value.idVerificationDate).toBe('2026-05-20');
    expect(result.value.amendments).toHaveLength(1);
    const amendment = result.value.amendments?.[0];
    expect(amendment?.reason).toBe('ID verified in person');
    expect(amendment?.actor).toBe(ORIGINAL_ASSESSOR);
    const changedFields = amendment?.changes.map((change) => change.field) ?? [];
    expect(changedFields).toContain('kycStatus');
    expect(changedFields).toContain('idVerificationDate');
  });

  it('rejects an empty reason', () => {
    const { service, record } = seedLowRiskRecord();
    const result = service.updateWorkflowState(record.clientId, { kycStatus: 'APPROVED' }, '   ');
    expect(result.ok).toBe(false);
  });

  it('rejects when no fields actually change', () => {
    const { service, record } = seedLowRiskRecord();
    const result = service.updateWorkflowState(
      record.clientId,
      { kycStatus: record.kycStatus },
      'No-op',
    );
    expect(result.ok).toBe(false);
  });

  it('rejects HIGH + APPROVED workflow combination', () => {
    const { service } = buildSetup();
    const submission = service.submit(
      buildValidDraft({ pepStatus: true, kycStatus: 'ENHANCED_DUE_DILIGENCE' }),
    );
    if (!submission.ok) throw new Error('seed failed');
    const result = service.updateWorkflowState(
      submission.value.clientId,
      { kycStatus: 'APPROVED' },
      'Compliance signed off',
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.some((issue) => issue.message.includes('senior compliance'))).toBe(true);
  });

  it('rejects APPROVED status without an id_verification_date', () => {
    const { service, record } = seedLowRiskRecord();
    const result = service.updateWorkflowState(
      record.clientId,
      { kycStatus: 'APPROVED' },
      'Sign off pending docs',
    );
    expect(result.ok).toBe(false);
  });

  it('refuses to amend a record that has been superseded', () => {
    const { service, record } = seedLowRiskRecord();
    const supersede = service.submit(buildValidDraft(), {
      originalClientId: record.clientId,
      reason: 'Re-assessing',
    });
    if (!supersede.ok) throw new Error('supersede failed');

    const result = service.updateWorkflowState(
      record.clientId,
      { documentationComplete: true },
      'Backfilling docs on superseded record',
    );
    expect(result.ok).toBe(false);
  });

  it('appends amendments rather than overwriting them across multiple updates', () => {
    const { service, record } = seedLowRiskRecord();
    const first = service.updateWorkflowState(
      record.clientId,
      { documentationComplete: false },
      'Withdrawn pending follow-up',
    );
    if (!first.ok) throw new Error('first amend failed');

    const second = service.updateWorkflowState(
      record.clientId,
      { documentationComplete: true },
      'Resubmitted docs',
    );
    if (!second.ok) throw new Error('second amend failed');

    expect(second.value.amendments).toHaveLength(2);
  });
});
