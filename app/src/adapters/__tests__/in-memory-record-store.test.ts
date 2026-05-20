import { describe, it, expect, vi } from 'vitest';
import { InMemoryRecordStore } from '@/adapters/in-memory-record-store';
import type { ClientRecord } from '@/domain/types';

function buildRecord(overrides: Partial<ClientRecord> & { readonly clientId: string }): ClientRecord {
  return {
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
    ...overrides,
  };
}

describe('InMemoryRecordStore', () => {
  it('starts empty', () => {
    const store = new InMemoryRecordStore();
    expect(store.list()).toEqual([]);
    expect(store.hasSeed()).toBe(false);
  });

  it('seed() sets records and marks as seeded', () => {
    const store = new InMemoryRecordStore();
    store.seed([buildRecord({ clientId: 'CLT-001' }), buildRecord({ clientId: 'CLT-002' })]);
    expect(store.hasSeed()).toBe(true);
    expect(store.list()).toHaveLength(2);
  });

  it('seed() is a no-op when already seeded', () => {
    const store = new InMemoryRecordStore();
    store.seed([buildRecord({ clientId: 'CLT-001' })]);
    store.seed([buildRecord({ clientId: 'CLT-999' })]);
    expect(store.list().map((record) => record.clientId)).toEqual(['CLT-001']);
  });

  it('add() puts a record into the store and get() returns it', () => {
    const store = new InMemoryRecordStore();
    const record = buildRecord({ clientId: 'CLT-100' });
    store.add(record);
    expect(store.get('CLT-100')).toEqual(record);
  });

  it('get() returns null for unknown clientId', () => {
    const store = new InMemoryRecordStore();
    expect(store.get('CLT-DOES-NOT-EXIST')).toBeNull();
  });

  it('list() sorts records by onboardingDate desc, tiebreaking by clientId asc', () => {
    const store = new InMemoryRecordStore();
    store.add(buildRecord({ clientId: 'CLT-002', onboardingDate: '2024-01-01' }));
    store.add(buildRecord({ clientId: 'CLT-001', onboardingDate: '2024-01-01' }));
    store.add(buildRecord({ clientId: 'CLT-003', onboardingDate: '2024-06-01' }));
    expect(store.list().map((record) => record.clientId)).toEqual([
      'CLT-003',
      'CLT-001',
      'CLT-002',
    ]);
  });

  it('subscribe() invokes the listener on add and seed', () => {
    const store = new InMemoryRecordStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.seed([buildRecord({ clientId: 'CLT-001' })]);
    store.add(buildRecord({ clientId: 'CLT-100' }));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('subscribe() returns an unsubscribe function that detaches the listener', () => {
    const store = new InMemoryRecordStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.add(buildRecord({ clientId: 'CLT-100' }));
    expect(listener).not.toHaveBeenCalled();
  });

  it('list() returns a stable snapshot reference when no mutation has occurred', () => {
    const store = new InMemoryRecordStore();
    store.seed([buildRecord({ clientId: 'CLT-001' })]);
    const firstCall = store.list();
    const secondCall = store.list();
    expect(secondCall).toBe(firstCall);
  });

  it('list() returns a new snapshot reference after add() or seed() mutations', () => {
    const store = new InMemoryRecordStore();
    store.seed([buildRecord({ clientId: 'CLT-001' })]);
    const beforeAdd = store.list();
    store.add(buildRecord({ clientId: 'CLT-002' }));
    const afterAdd = store.list();
    expect(afterAdd).not.toBe(beforeAdd);
  });
});
