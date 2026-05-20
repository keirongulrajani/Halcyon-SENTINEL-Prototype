import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRecordStore } from '@/adapters/local-storage-record-store';
import type { ClientRecord } from '@/domain/types';

const DEFAULT_STORAGE_KEY = 'halcyon.sentinel.records.v1';

function buildRecord(clientId: string): ClientRecord {
  return {
    clientId,
    branch: 'Mayfair',
    onboardingDate: '2024-01-01',
    clientName: `Client ${clientId}`,
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

describe('LocalStorageRecordStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty when localStorage is empty', () => {
    const store = new LocalStorageRecordStore();
    expect(store.list()).toEqual([]);
    expect(store.hasSeed()).toBe(false);
  });

  it('persists added records to localStorage with the configured storage key', () => {
    const store = new LocalStorageRecordStore({ storageKey: 'custom.key' });
    store.add(buildRecord('CLT-100'));
    const raw = localStorage.getItem('custom.key');
    expect(raw).not.toBeNull();
    expect(raw).toContain('CLT-100');
  });

  it('re-instantiating the store hydrates from localStorage', () => {
    const first = new LocalStorageRecordStore();
    first.seed([buildRecord('CLT-001'), buildRecord('CLT-002')]);
    const second = new LocalStorageRecordStore();
    expect(second.list().map((record) => record.clientId).sort()).toEqual(['CLT-001', 'CLT-002']);
  });

  it('hasSeed() returns true after first seed and remains true on re-instantiation', () => {
    const first = new LocalStorageRecordStore();
    first.seed([buildRecord('CLT-001')]);
    expect(first.hasSeed()).toBe(true);
    const second = new LocalStorageRecordStore();
    expect(second.hasSeed()).toBe(true);
  });

  it('tolerates a corrupted/invalid JSON value in localStorage', () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, '{not valid json');
    const store = new LocalStorageRecordStore();
    expect(store.list()).toEqual([]);
  });

  it('uses default storage key when not provided', () => {
    const store = new LocalStorageRecordStore();
    store.add(buildRecord('CLT-200'));
    const raw = localStorage.getItem(DEFAULT_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(raw).toContain('CLT-200');
  });
});
