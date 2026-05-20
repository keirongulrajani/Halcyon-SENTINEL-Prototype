import { classify } from '@/domain/rules-engine';
import { validateDraft } from '@/domain/validation';
import type { ValidationIssue } from '@/domain/validation';
import type { RuleSet } from '@/domain/rules';
import { DEFAULT_RULES } from '@/domain/rules';
import type { Result } from '@/domain/result';
import { err, ok } from '@/domain/result';
import type {
  AmendmentEntry,
  AssessmentDraft,
  ClientRecord,
  WorkflowStateChange,
  WorkflowStatePatch,
} from '@/domain/types';
import type {
  Clock,
  ClientIdGenerator,
  IdGenerator,
  RecordStore,
} from '@/domain/ports';

export interface AssessmentServiceDependencies {
  readonly recordStore: RecordStore;
  readonly clock: Clock;
  readonly clientIdGenerator: ClientIdGenerator;
  readonly amendmentIdGenerator: IdGenerator;
  readonly rules: RuleSet;
  readonly currentAssessor: string;
}

export interface SupersedeContext {
  readonly originalClientId: string;
  readonly reason: string;
}

export class AssessmentService {
  private readonly dependencies: AssessmentServiceDependencies;

  constructor(dependencies: AssessmentServiceDependencies) {
    this.dependencies = dependencies;
  }

  preview(draft: AssessmentDraft) {
    return classify(
      {
        branch: draft.branch ?? 'Mayfair',
        clientName: draft.clientName,
        clientType: draft.clientType ?? 'INDIVIDUAL',
        countryOfTaxResidence: draft.countryOfTaxResidence,
        annualIncome: draft.annualIncome ?? 0,
        sourceOfFunds: draft.sourceOfFunds ?? 'Other',
        pepStatus: draft.pepStatus,
        sanctionsScreeningMatch: draft.sanctionsScreeningMatch,
        adverseMediaFlag: draft.adverseMediaFlag,
      },
      this.dependencies.rules,
    );
  }

  submit(
    draft: AssessmentDraft,
    supersede?: SupersedeContext,
  ): Result<ClientRecord, readonly ValidationIssue[]> {
    const validation = validateDraft(draft, this.dependencies.rules);
    if (!validation.ok) return validation;

    if (supersede !== undefined) {
      const reasonTrimmed = supersede.reason.trim();
      if (reasonTrimmed === '') {
        return err([
          {
            field: 'workflow',
            message: 'A reason is required when superseding an existing record.',
          },
        ]);
      }
      const original = this.dependencies.recordStore.get(supersede.originalClientId);
      if (original === null) {
        return err([
          { field: 'workflow', message: `Original record ${supersede.originalClientId} not found.` },
        ]);
      }
      if (original.supersededBy !== undefined) {
        return err([
          {
            field: 'workflow',
            message: `Record ${supersede.originalClientId} has already been superseded by ${original.supersededBy}.`,
          },
        ]);
      }
    }

    const valid = validation.value;
    const verdict = classify(valid, this.dependencies.rules);
    const assessedAt = this.dependencies.clock.now().toISOString();
    const newClientId = this.dependencies.clientIdGenerator.nextClientId();

    const baseRecord: ClientRecord = {
      clientId: newClientId,
      branch: valid.branch,
      onboardingDate: assessedAt.slice(0, 10),
      clientName: valid.clientName,
      clientType: valid.clientType,
      countryOfTaxResidence: valid.countryOfTaxResidence,
      annualIncome: valid.annualIncome,
      sourceOfFunds: valid.sourceOfFunds,
      pepStatus: valid.pepStatus,
      sanctionsScreeningMatch: valid.sanctionsScreeningMatch,
      adverseMediaFlag: valid.adverseMediaFlag,
      storedRiskClassification: verdict.tier,
      kycStatus: valid.kycStatus,
      idVerificationDate: valid.idVerificationDate,
      relationshipManager: valid.relationshipManager,
      documentationComplete: valid.documentationComplete,
      assessedBy: this.dependencies.currentAssessor,
      assessedAt,
      rulesVersion: verdict.rulesVersion,
      firedRuleIds: verdict.firedRules.map((rule) => rule.ruleId),
    };

    const newRecord: ClientRecord =
      supersede === undefined ? baseRecord : { ...baseRecord, supersedes: supersede.originalClientId };

    this.dependencies.recordStore.add(newRecord);

    if (supersede !== undefined) {
      const original = this.dependencies.recordStore.get(supersede.originalClientId);
      if (original !== null) {
        const supersededOriginal: ClientRecord = { ...original, supersededBy: newClientId };
        this.dependencies.recordStore.add(supersededOriginal);
      }
    }

    return ok(newRecord);
  }

  updateWorkflowState(
    clientId: string,
    patch: WorkflowStatePatch,
    reason: string,
  ): Result<ClientRecord, readonly ValidationIssue[]> {
    const reasonTrimmed = reason.trim();
    if (reasonTrimmed === '') {
      return err([
        { field: 'workflow', message: 'A reason is required when updating workflow state.' },
      ]);
    }

    const existing = this.dependencies.recordStore.get(clientId);
    if (existing === null) {
      return err([{ field: 'workflow', message: `Record ${clientId} not found.` }]);
    }
    if (existing.supersededBy !== undefined) {
      return err([
        {
          field: 'workflow',
          message: `Record ${clientId} has been superseded by ${existing.supersededBy} and cannot be amended directly.`,
        },
      ]);
    }

    const changes = computeWorkflowChanges(existing, patch);
    if (changes.length === 0) {
      return err([{ field: 'workflow', message: 'No workflow changes detected.' }]);
    }

    const updatedRecord = applyWorkflowPatch(existing, patch);
    if (
      updatedRecord.storedRiskClassification === 'HIGH' &&
      updatedRecord.kycStatus === 'APPROVED'
    ) {
      return err([
        {
          field: 'workflow',
          message:
            'HIGH-risk clients cannot be APPROVED without Enhanced Due Diligence and senior compliance sign-off.',
        },
      ]);
    }
    if (updatedRecord.kycStatus === 'APPROVED' && updatedRecord.idVerificationDate === null) {
      return err([
        {
          field: 'workflow',
          message: 'ID verification date is required for APPROVED records.',
        },
      ]);
    }

    const amendment: AmendmentEntry = {
      id: this.dependencies.amendmentIdGenerator.next(),
      at: this.dependencies.clock.now().toISOString(),
      actor: this.dependencies.currentAssessor,
      reason: reasonTrimmed,
      changes,
    };

    const previousAmendments = existing.amendments ?? [];
    const amendedRecord: ClientRecord = {
      ...updatedRecord,
      amendments: [...previousAmendments, amendment],
    };

    this.dependencies.recordStore.add(amendedRecord);
    return ok(amendedRecord);
  }
}

export function makeAssessmentService(
  dependencies: Omit<AssessmentServiceDependencies, 'rules'> & { readonly rules?: RuleSet },
): AssessmentService {
  return new AssessmentService({
    ...dependencies,
    rules: dependencies.rules ?? DEFAULT_RULES,
  });
}

function computeWorkflowChanges(
  existing: ClientRecord,
  patch: WorkflowStatePatch,
): readonly WorkflowStateChange[] {
  const changes: WorkflowStateChange[] = [];

  if (patch.kycStatus !== undefined && patch.kycStatus !== existing.kycStatus) {
    changes.push({
      field: 'kycStatus',
      previousValue: existing.kycStatus,
      newValue: patch.kycStatus,
    });
  }
  if (patch.idVerificationDate !== undefined && patch.idVerificationDate !== existing.idVerificationDate) {
    changes.push({
      field: 'idVerificationDate',
      previousValue: existing.idVerificationDate,
      newValue: patch.idVerificationDate,
    });
  }
  if (
    patch.documentationComplete !== undefined &&
    patch.documentationComplete !== existing.documentationComplete
  ) {
    changes.push({
      field: 'documentationComplete',
      previousValue: existing.documentationComplete,
      newValue: patch.documentationComplete,
    });
  }
  if (
    patch.relationshipManager !== undefined &&
    patch.relationshipManager !== existing.relationshipManager
  ) {
    changes.push({
      field: 'relationshipManager',
      previousValue: existing.relationshipManager,
      newValue: patch.relationshipManager,
    });
  }
  return changes;
}

function applyWorkflowPatch(existing: ClientRecord, patch: WorkflowStatePatch): ClientRecord {
  return {
    ...existing,
    kycStatus: patch.kycStatus ?? existing.kycStatus,
    idVerificationDate:
      patch.idVerificationDate !== undefined ? patch.idVerificationDate : existing.idVerificationDate,
    documentationComplete: patch.documentationComplete ?? existing.documentationComplete,
    relationshipManager: patch.relationshipManager ?? existing.relationshipManager,
  };
}
