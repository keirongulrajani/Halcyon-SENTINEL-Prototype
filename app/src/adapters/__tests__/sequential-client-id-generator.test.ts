import { describe, it, expect } from 'vitest';
import { InMemoryRecordStore } from '@/adapters/in-memory-record-store';
import { SequentialClientIdGenerator } from '@/adapters/sequential-client-id-generator';
import { loadCsvRecords } from '@/test/csv-fixture';
import type { ClientRecord } from '@/domain/types';

function buildRecord(clientId: string): ClientRecord {
  return {
    clientId,
    branch: 'Mayfair',
    onboardingDate: '2024-01-01',
    clientName: 'Test',
    clientType: 'INDIVIDUAL',
    countryOfTaxResidence: 'Netherlands',
    annualIncome: 50_000,
    sourceOfFunds: 'Employment',
    pepStatus: false,
    sanctionsScreeningMatch: false,
    adverseMediaFlag: false,
    storedRiskClassification: 'LOW',
    kycStatus: 'APPROVED',
    idVerificationDate: '2024-01-01',
    relationshipManager: 'R. Patel',
    documentationComplete: true,
  };
}

describe('SequentialClientIdGenerator', () => {
  it("returns 'CLT-001' when the store is empty", () => {
    const store = new InMemoryRecordStore();
    const generator = new SequentialClientIdGenerator(store);
    expect(generator.nextClientId()).toBe('CLT-001');
  });

  it("returns 'CLT-047' when the store has CLT-001 through CLT-046", () => {
    const store = new InMemoryRecordStore();
    store.seed(loadCsvRecords());
    const generator = new SequentialClientIdGenerator(store);
    expect(generator.nextClientId()).toBe('CLT-047');
  });

  it('continues sequentially across multiple calls', () => {
    const store = new InMemoryRecordStore();
    const generator = new SequentialClientIdGenerator(store);
    const first = generator.nextClientId();
    expect(first).toBe('CLT-001');
    store.add(buildRecord(first));
    expect(generator.nextClientId()).toBe('CLT-002');
  });

  it('skips non-matching IDs', () => {
    const store = new InMemoryRecordStore();
    store.add(buildRecord('NON-MATCHING'));
    store.add(buildRecord('CLT-005'));
    const generator = new SequentialClientIdGenerator(store);
    expect(generator.nextClientId()).toBe('CLT-006');
  });

  it('pads to 3 digits', () => {
    const store = new InMemoryRecordStore();
    const generator = new SequentialClientIdGenerator(store);
    expect(generator.nextClientId()).toMatch(/^CLT-\d{3}$/);
  });
});
