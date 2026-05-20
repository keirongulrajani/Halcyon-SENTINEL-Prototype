import { classify } from './rules-engine';
import type { RuleSet } from './rules';
import { DEFAULT_RULES } from './rules';
import type { ClientRecord, Finding, FindingSeverity } from './types';
import { isHighRisk } from './risk-tier';

const FINDING_SEVERITY_ORDER: Record<FindingSeverity, number> = {
  CLASSIFICATION_MISMATCH: 0,
  WORKFLOW_VIOLATION: 1,
  MISSING_FIELD: 2,
};

function isApprovedWithoutIdVerification(record: ClientRecord): boolean {
  return record.kycStatus === 'APPROVED' && record.idVerificationDate === null;
}

function isApprovedHighRisk(record: ClientRecord, derivedTier: ClientRecord['storedRiskClassification']): boolean {
  return isHighRisk(derivedTier) && record.kycStatus === 'APPROVED';
}

function makeFindingId(clientId: string, suffix: string): string {
  return `${clientId}::${suffix}`;
}

export function detectFindingsForRecord(
  record: ClientRecord,
  rules: RuleSet = DEFAULT_RULES,
): readonly Finding[] {
  const findings: Finding[] = [];
  const verdict = classify(record, rules);

  if (verdict.tier !== record.storedRiskClassification) {
    const reasons = verdict.firedRules.map((rule) => rule.predicateLabel).join('; ');
    findings.push({
      id: makeFindingId(record.clientId, 'mismatch'),
      clientId: record.clientId,
      severity: 'CLASSIFICATION_MISMATCH',
      rule: 'Stored classification must match the regulatory rules applied to the recorded data',
      detail: `Stored as ${record.storedRiskClassification}; rules engine derives ${verdict.tier} (${reasons || 'no triggers'}).`,
      recommendedAction: `Re-classify ${record.clientId} as ${verdict.tier} and apply ${verdict.requiredActions.join(', ') || 'no further actions'}.`,
    });
  }

  if (isApprovedHighRisk(record, verdict.tier)) {
    findings.push({
      id: makeFindingId(record.clientId, 'workflow-high-approved'),
      clientId: record.clientId,
      severity: 'WORKFLOW_VIOLATION',
      rule: 'HIGH-risk clients cannot be APPROVED without Enhanced Due Diligence and senior compliance sign-off',
      detail: `${record.clientId} is HIGH risk but kyc_status is APPROVED.`,
      recommendedAction: 'Move to ENHANCED_DUE_DILIGENCE and obtain senior compliance sign-off before approval.',
    });
  }

  if (record.relationshipManager === null) {
    findings.push({
      id: makeFindingId(record.clientId, 'missing-rm'),
      clientId: record.clientId,
      severity: 'MISSING_FIELD',
      rule: 'Every assessment must be attributable to a relationship manager',
      detail: `${record.clientId} has no relationship_manager recorded.`,
      recommendedAction: 'Attribute the assessment to the responsible relationship manager.',
    });
  }

  if (isApprovedWithoutIdVerification(record)) {
    findings.push({
      id: makeFindingId(record.clientId, 'missing-id-verification'),
      clientId: record.clientId,
      severity: 'MISSING_FIELD',
      rule: 'APPROVED records must have an identity verification date',
      detail: `${record.clientId} is APPROVED but id_verification_date is empty.`,
      recommendedAction: 'Verify identity documents and record the verification date.',
    });
  }

  return findings;
}

export function detectFindings(
  records: readonly ClientRecord[],
  rules: RuleSet = DEFAULT_RULES,
): readonly Finding[] {
  return records.flatMap((record) => detectFindingsForRecord(record, rules));
}

export function sortFindingsBySeverity(findings: readonly Finding[]): readonly Finding[] {
  return [...findings].sort(
    (a, b) => FINDING_SEVERITY_ORDER[a.severity] - FINDING_SEVERITY_ORDER[b.severity],
  );
}

export function groupFindingsBySeverity(
  findings: readonly Finding[],
): Readonly<Record<FindingSeverity, readonly Finding[]>> {
  const buckets: Record<FindingSeverity, Finding[]> = {
    CLASSIFICATION_MISMATCH: [],
    WORKFLOW_VIOLATION: [],
    MISSING_FIELD: [],
  };
  for (const finding of findings) {
    buckets[finding.severity].push(finding);
  }
  return buckets;
}
