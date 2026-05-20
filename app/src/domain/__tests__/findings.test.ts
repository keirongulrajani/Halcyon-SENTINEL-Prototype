import { describe, it, expect } from 'vitest';
import {
  detectFindings,
  sortFindingsBySeverity,
} from '@/domain/findings';
import { loadCsvRecords } from '@/test/csv-fixture';
import type { Finding } from '@/domain/types';

const records = loadCsvRecords();
const findings = detectFindings(records);

function findingsFor(clientId: string): readonly Finding[] {
  return findings.filter((finding) => finding.clientId === clientId);
}

function hasFindingMentioning(clientId: string, severity: Finding['severity'], needle: string): boolean {
  return findingsFor(clientId).some(
    (finding) => finding.severity === severity && finding.detail.includes(needle),
  );
}

describe('detectFindings — overall count', () => {
  it('finds exactly the 9 planted findings across the 46 CSV records', () => {
    const distinctClientIds = new Set(findings.map((finding) => finding.clientId));
    expect(records).toHaveLength(46);
    expect(distinctClientIds.size).toBe(9);
    expect(findings.map((finding) => finding.id).sort()).toEqual([
      'CLT-005::mismatch',
      'CLT-005::workflow-high-approved',
      'CLT-009::missing-id-verification',
      'CLT-012::missing-rm',
      'CLT-017::mismatch',
      'CLT-017::workflow-high-approved',
      'CLT-023::missing-id-verification',
      'CLT-023::workflow-high-approved',
      'CLT-027::missing-rm',
      'CLT-031::mismatch',
      'CLT-031::missing-id-verification',
      'CLT-031::workflow-high-approved',
      'CLT-039::missing-id-verification',
      'CLT-042::missing-rm',
    ]);
  });
});

describe('detectFindings — classification mismatches', () => {
  it.each(['CLT-005', 'CLT-017', 'CLT-031'])(
    'flags %s as a classification mismatch from LOW to HIGH',
    (clientId) => {
      const mismatch = findingsFor(clientId).find(
        (finding) => finding.severity === 'CLASSIFICATION_MISMATCH',
      );
      expect(mismatch).toBeDefined();
      expect(mismatch?.detail).toContain('HIGH');
      expect(mismatch?.detail).toContain('LOW');
    },
  );
});

describe('detectFindings — workflow violations', () => {
  it('flags CLT-023 as a workflow violation (HIGH + APPROVED)', () => {
    const violation = findingsFor('CLT-023').find(
      (finding) => finding.severity === 'WORKFLOW_VIOLATION',
    );
    expect(violation).toBeDefined();
    expect(violation?.detail).toContain('HIGH');
    expect(violation?.detail).toContain('APPROVED');
  });
});

describe('detectFindings — missing relationship_manager', () => {
  it.each(['CLT-012', 'CLT-027', 'CLT-042'])(
    '%s has a MISSING_FIELD finding referencing relationship_manager',
    (clientId) => {
      const isFlagged = hasFindingMentioning(clientId, 'MISSING_FIELD', 'relationship_manager');
      expect(isFlagged).toBe(true);
    },
  );
});

describe('detectFindings — missing id_verification_date', () => {
  it.each(['CLT-031', 'CLT-039'])(
    '%s has a MISSING_FIELD finding referencing id_verification_date',
    (clientId) => {
      const isFlagged = hasFindingMentioning(clientId, 'MISSING_FIELD', 'id_verification_date');
      expect(isFlagged).toBe(true);
    },
  );

  it('CLT-031 has TWO findings (mismatch and missing id) plus the workflow violation', () => {
    const clientFindings = findingsFor('CLT-031');
    const severities = clientFindings.map((finding) => finding.severity);
    expect(severities).toContain('CLASSIFICATION_MISMATCH');
    expect(severities).toContain('MISSING_FIELD');
    expect(severities).toContain('WORKFLOW_VIOLATION');
  });
});

describe('detectFindings — false-positive guards', () => {
  it('does not flag MEDIUM+EDD records as findings (CLT-025, CLT-037)', () => {
    expect(findingsFor('CLT-025')).toHaveLength(0);
    expect(findingsFor('CLT-037')).toHaveLength(0);
  });

  it('does not flag CLT-024 (NL, 1.2M, Pension) — Pension is not in the MEDIUM income source list', () => {
    expect(findingsFor('CLT-024')).toHaveLength(0);
  });

  it('does not flag CLT-007 or CLT-011 — income at exactly 500,000 does not trigger the strict-greater-than income rule', () => {
    expect(findingsFor('CLT-007')).toHaveLength(0);
    expect(findingsFor('CLT-011')).toHaveLength(0);
  });
});

describe('sortFindingsBySeverity', () => {
  it('places CLASSIFICATION_MISMATCH before WORKFLOW_VIOLATION before MISSING_FIELD', () => {
    const sorted = sortFindingsBySeverity(findings);
    const firstMismatchIndex = sorted.findIndex(
      (finding) => finding.severity === 'CLASSIFICATION_MISMATCH',
    );
    const firstWorkflowIndex = sorted.findIndex(
      (finding) => finding.severity === 'WORKFLOW_VIOLATION',
    );
    const firstMissingIndex = sorted.findIndex(
      (finding) => finding.severity === 'MISSING_FIELD',
    );
    expect(firstMismatchIndex).toBeGreaterThanOrEqual(0);
    expect(firstWorkflowIndex).toBeGreaterThan(firstMismatchIndex);
    expect(firstMissingIndex).toBeGreaterThan(firstWorkflowIndex);
  });
});
