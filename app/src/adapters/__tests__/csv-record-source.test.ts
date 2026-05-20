import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CsvRecordSource } from '@/adapters/csv-record-source';

const CSV_PATH = path.resolve(process.cwd(), '../client_onboarding.csv');

function stubFetchWith(body: string, ok: boolean = true, status: number = 200): void {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    text: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
}

describe('CsvRecordSource', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('R1.1: loads all 46 rows from the seeded CSV', async () => {
    stubFetchWith(readFileSync(CSV_PATH, 'utf-8'));
    const source = new CsvRecordSource();
    const records = await source.load();
    expect(records).toHaveLength(46);
  });

  it('R1.2: parses string "TRUE"/"FALSE" into real booleans', async () => {
    stubFetchWith(readFileSync(CSV_PATH, 'utf-8'));
    const source = new CsvRecordSource();
    const records = await source.load();
    for (const record of records) {
      expect(typeof record.pepStatus).toBe('boolean');
      expect(typeof record.sanctionsScreeningMatch).toBe('boolean');
      expect(typeof record.adverseMediaFlag).toBe('boolean');
      expect(typeof record.documentationComplete).toBe('boolean');
    }
  });

  it('R1.3: parses annual_income as a number', async () => {
    stubFetchWith(readFileSync(CSV_PATH, 'utf-8'));
    const source = new CsvRecordSource();
    const records = await source.load();
    for (const record of records) {
      expect(typeof record.annualIncome).toBe('number');
      expect(Number.isFinite(record.annualIncome)).toBe(true);
    }
  });

  it('R1.3: converts empty id_verification_date to null', async () => {
    stubFetchWith(readFileSync(CSV_PATH, 'utf-8'));
    const source = new CsvRecordSource();
    const records = await source.load();
    const recordsWithNullDate = records.filter((record) => record.idVerificationDate === null);
    expect(recordsWithNullDate.length).toBeGreaterThan(0);
  });

  it('R1.3: converts empty relationship_manager to null', async () => {
    stubFetchWith(readFileSync(CSV_PATH, 'utf-8'));
    const source = new CsvRecordSource();
    const records = await source.load();
    const recordsWithNullRm = records.filter((record) => record.relationshipManager === null);
    expect(recordsWithNullRm.length).toBeGreaterThan(0);
  });

  it('R1.4: maps snake_case CSV columns to camelCase ClientRecord properties', async () => {
    stubFetchWith(readFileSync(CSV_PATH, 'utf-8'));
    const source = new CsvRecordSource();
    const records = await source.load();
    const first = records[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect(first).toHaveProperty('clientId');
    expect(first).toHaveProperty('countryOfTaxResidence');
    expect(first).toHaveProperty('storedRiskClassification');
    expect(first).toHaveProperty('kycStatus');
    expect(first).toHaveProperty('idVerificationDate');
    expect(first).toHaveProperty('relationshipManager');
    expect(first).toHaveProperty('documentationComplete');
    expect(first).toHaveProperty('sanctionsScreeningMatch');
    expect(first).toHaveProperty('adverseMediaFlag');
    expect(first).toHaveProperty('pepStatus');
    expect(first).toHaveProperty('annualIncome');
    expect(first).toHaveProperty('sourceOfFunds');
    expect(first).toHaveProperty('onboardingDate');
    expect(first).toHaveProperty('clientName');
    expect(first).toHaveProperty('clientType');
    expect(first).toHaveProperty('branch');
  });

  it('R1.5: preserves storedRiskClassification distinct from a derivable verdict', async () => {
    stubFetchWith(readFileSync(CSV_PATH, 'utf-8'));
    const source = new CsvRecordSource();
    const records = await source.load();
    const clt005 = records.find((record) => record.clientId === 'CLT-005');
    expect(clt005).toBeDefined();
    expect(clt005?.storedRiskClassification).toBe('LOW');
    expect(clt005?.pepStatus).toBe(true);
  });

  it('throws when fetch returns non-ok status', async () => {
    stubFetchWith('', false, 404);
    const source = new CsvRecordSource();
    await expect(source.load()).rejects.toThrow(/HTTP 404/);
  });

  it('throws when annual_income is non-numeric', async () => {
    const malformedCsv = [
      'client_id,branch,onboarding_date,client_name,client_type,country_of_tax_residence,annual_income,source_of_funds,pep_status,sanctions_screening_match,adverse_media_flag,risk_classification,kyc_status,id_verification_date,relationship_manager,documentation_complete',
      'CLT-X01,Mayfair,2024-11-04,Bad Row,INDIVIDUAL,Netherlands,not-a-number,Employment,FALSE,FALSE,FALSE,LOW,APPROVED,2024-10-14,R. Patel,TRUE',
    ].join('\n');
    stubFetchWith(malformedCsv);
    const source = new CsvRecordSource();
    await expect(source.load()).rejects.toThrow(/annual_income/);
  });
});
