import { describe, it, expect } from 'vitest';
import { FindingsService } from '@/application/findings-service';
import { InMemoryRecordStore } from '@/adapters/in-memory-record-store';
import { DEFAULT_RULES } from '@/domain/rules';
import { loadCsvRecords } from '@/test/csv-fixture';
import type { Finding } from '@/domain/types';

function buildService(): FindingsService {
  const store = new InMemoryRecordStore();
  store.seed(loadCsvRecords());
  return new FindingsService({ recordStore: store, rules: DEFAULT_RULES });
}

function findingsForClient(findings: readonly Finding[], clientId: string): readonly Finding[] {
  return findings.filter((finding) => finding.clientId === clientId);
}

describe('FindingsService', () => {
  it('R3.1 + R3.6: allFindings() includes a CLASSIFICATION_MISMATCH for CLT-005', () => {
    const service = buildService();
    const findings = service.allFindings();
    const mismatch = findingsForClient(findings, 'CLT-005').find(
      (finding) => finding.severity === 'CLASSIFICATION_MISMATCH',
    );
    expect(mismatch).toBeDefined();
  });

  it.each(['CLT-005', 'CLT-017', 'CLT-031'])(
    'R3.6 + R3.7 + R3.8: classification mismatch finding exists for %s',
    (clientId) => {
      const service = buildService();
      const findings = service.allFindings();
      const mismatch = findingsForClient(findings, clientId).find(
        (finding) => finding.severity === 'CLASSIFICATION_MISMATCH',
      );
      expect(mismatch).toBeDefined();
    },
  );

  it('R3.2 + R3.14: WORKFLOW_VIOLATION exists for CLT-023 (HIGH + APPROVED)', () => {
    const service = buildService();
    const findings = service.allFindings();
    const violation = findingsForClient(findings, 'CLT-023').find(
      (finding) => finding.severity === 'WORKFLOW_VIOLATION',
    );
    expect(violation).toBeDefined();
  });

  it.each(['CLT-012', 'CLT-027', 'CLT-042'])(
    'R3.3 + R3.9 + R3.10 + R3.11: missing-RM finding exists for %s',
    (clientId) => {
      const service = buildService();
      const findings = service.allFindings();
      const missing = findingsForClient(findings, clientId).find(
        (finding) => finding.severity === 'MISSING_FIELD' && finding.detail.includes('relationship_manager'),
      );
      expect(missing).toBeDefined();
    },
  );

  it.each(['CLT-031', 'CLT-039', 'CLT-009'])(
    'R3.4 + R3.12 + R3.13: missing id_verification_date finding exists for %s',
    (clientId) => {
      const service = buildService();
      const findings = service.allFindings();
      const missing = findingsForClient(findings, clientId).find(
        (finding) => finding.severity === 'MISSING_FIELD' && finding.detail.includes('id_verification_date'),
      );
      expect(missing).toBeDefined();
    },
  );

  it.each(['CLT-025', 'CLT-037'])(
    'R3.15: %s produces NO classification-mismatch finding (MEDIUM with EDD is legitimate)',
    (clientId) => {
      const service = buildService();
      const findings = service.allFindings();
      const mismatch = findingsForClient(findings, clientId).find(
        (finding) => finding.severity === 'CLASSIFICATION_MISMATCH',
      );
      expect(mismatch).toBeUndefined();
    },
  );

  it('R3.17: CLT-024 (NL, 1.2M, Pension) produces NO classification-mismatch finding', () => {
    const service = buildService();
    const findings = service.allFindings();
    const mismatch = findingsForClient(findings, 'CLT-024').find(
      (finding) => finding.severity === 'CLASSIFICATION_MISMATCH',
    );
    expect(mismatch).toBeUndefined();
  });

  it.each(['CLT-007', 'CLT-011'])(
    'R3.18: %s (income exactly 500,000) produces NO classification-mismatch finding',
    (clientId) => {
      const service = buildService();
      const findings = service.allFindings();
      const mismatch = findingsForClient(findings, clientId).find(
        (finding) => finding.severity === 'CLASSIFICATION_MISMATCH',
      );
      expect(mismatch).toBeUndefined();
    },
  );

  it('findingsForRecord(clientId) returns findings only for that record', () => {
    const service = buildService();
    const findings = service.findingsForRecord('CLT-005');
    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding.clientId).toBe('CLT-005');
    }
  });

  it('verdictForRecord() returns the same tier as the rules engine', () => {
    const service = buildService();
    const store = new InMemoryRecordStore();
    store.seed(loadCsvRecords());
    const record = store.get('CLT-005');
    expect(record).not.toBeNull();
    if (!record) return;
    expect(service.verdictForRecord(record).tier).toBe('HIGH');
  });

  it('hasFindings() returns true for CLT-005 and false for CLT-001', () => {
    const service = buildService();
    const store = new InMemoryRecordStore();
    store.seed(loadCsvRecords());
    const flagged = store.get('CLT-005');
    const clean = store.get('CLT-001');
    expect(flagged).not.toBeNull();
    expect(clean).not.toBeNull();
    if (!flagged || !clean) return;
    expect(service.hasFindings(flagged)).toBe(true);
    expect(service.hasFindings(clean)).toBe(false);
  });
});
