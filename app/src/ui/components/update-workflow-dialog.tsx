import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/dialog';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Switch } from '@/ui/components/switch';
import { Field, FieldError, FieldHint, FieldLabel } from '@/ui/components/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { useServices } from '@/ui/providers/services-context';
import { KNOWN_RELATIONSHIP_MANAGERS } from '@/config/relationship-managers';
import { ALL_KYC_STATUSES } from '@/domain/types';
import type {
  ClientRecord,
  KycStatus,
  WorkflowStatePatch,
} from '@/domain/types';

interface UpdateWorkflowDialogProps {
  readonly record: ClientRecord;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

interface DraftState {
  readonly kycStatus: KycStatus;
  readonly idVerificationDate: string | null;
  readonly documentationComplete: boolean;
  readonly relationshipManager: string;
  readonly reason: string;
}

function draftFromRecord(record: ClientRecord): DraftState {
  return {
    kycStatus: record.kycStatus,
    idVerificationDate: record.idVerificationDate,
    documentationComplete: record.documentationComplete,
    relationshipManager: record.relationshipManager ?? '',
    reason: '',
  };
}

function buildPatch(record: ClientRecord, draft: DraftState): WorkflowStatePatch {
  const patch: { -readonly [K in keyof WorkflowStatePatch]: WorkflowStatePatch[K] } = {};
  if (draft.kycStatus !== record.kycStatus) {
    patch.kycStatus = draft.kycStatus;
  }
  if (draft.idVerificationDate !== record.idVerificationDate) {
    patch.idVerificationDate = draft.idVerificationDate;
  }
  if (draft.documentationComplete !== record.documentationComplete) {
    patch.documentationComplete = draft.documentationComplete;
  }
  const existingManager = record.relationshipManager ?? '';
  if (draft.relationshipManager !== existingManager && draft.relationshipManager !== '') {
    patch.relationshipManager = draft.relationshipManager;
  }
  return patch;
}

function patchHasChanges(patch: WorkflowStatePatch): boolean {
  return (
    patch.kycStatus !== undefined ||
    patch.idVerificationDate !== undefined ||
    patch.documentationComplete !== undefined ||
    patch.relationshipManager !== undefined
  );
}

export function UpdateWorkflowDialog({ record, open, onOpenChange }: UpdateWorkflowDialogProps) {
  const { assessmentService } = useServices();
  const [draft, setDraft] = useState<DraftState>(() => draftFromRecord(record));
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(draftFromRecord(record));
      setSubmitError(null);
    }
  }, [open, record]);

  const patch = buildPatch(record, draft);
  const hasChanges = patchHasChanges(patch);
  const reasonProvided = draft.reason.trim() !== '';
  const canSubmit = hasChanges && reasonProvided;

  const isHighRisk = record.storedRiskClassification === 'HIGH';
  const isManagerBackfill = record.relationshipManager === null;
  const managerFieldLabel = isManagerBackfill ? 'Attribute to relationship manager' : 'Relationship manager';

  const updateDraft = <K extends keyof DraftState>(field: K, value: DraftState[K]) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    const result = assessmentService.updateWorkflowState(record.clientId, patch, draft.reason);
    if (result.ok) {
      setSubmitError(null);
      onOpenChange(false);
      return;
    }
    const firstIssue = result.error[0];
    setSubmitError(firstIssue?.message ?? 'Unable to update workflow state.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Update workflow state — <span className="tabular">{record.clientId}</span>
          </DialogTitle>
          <DialogDescription>
            Intake data is locked once submitted. Workflow state — KYC status, ID verification,
            documentation, and relationship manager — is meant to evolve as the compliance process
            progresses, and every change is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isHighRisk && (
            <div className="surface-card border-l-4 border-warning bg-warning-tint p-3 flex items-start gap-2">
              <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
              <p className="m-0 text-body">
                HIGH-risk clients require Enhanced Due Diligence and senior compliance sign-off —
                KYC status cannot be set to APPROVED directly here. Use &ldquo;Re-assess this
                client&rdquo; for a full new assessment.
              </p>
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="workflowKycStatus">KYC status</FieldLabel>
            <Select
              value={draft.kycStatus}
              onValueChange={(value) => updateDraft('kycStatus', value as KycStatus)}
            >
              <SelectTrigger id="workflowKycStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_KYC_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="workflowIdVerificationDate">ID verification date</FieldLabel>
            <Input
              id="workflowIdVerificationDate"
              type="date"
              value={draft.idVerificationDate ?? ''}
              onChange={(event) =>
                updateDraft(
                  'idVerificationDate',
                  event.target.value === '' ? null : event.target.value,
                )
              }
            />
            <FieldHint>Required when KYC status is APPROVED.</FieldHint>
          </Field>

          <Field>
            <FieldLabel htmlFor="workflowDocumentationComplete">Documentation complete</FieldLabel>
            <div className="flex items-center gap-3">
              <Switch
                id="workflowDocumentationComplete"
                checked={draft.documentationComplete}
                onCheckedChange={(value) => updateDraft('documentationComplete', value)}
              />
              <span className="text-body">
                {draft.documentationComplete ? 'Complete' : 'Incomplete'}
              </span>
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="workflowRelationshipManager">{managerFieldLabel}</FieldLabel>
            <Select
              value={draft.relationshipManager}
              onValueChange={(value) => updateDraft('relationshipManager', value)}
            >
              <SelectTrigger id="workflowRelationshipManager">
                <SelectValue placeholder="Select relationship manager" />
              </SelectTrigger>
              <SelectContent>
                {KNOWN_RELATIONSHIP_MANAGERS.map((manager) => (
                  <SelectItem key={manager} value={manager}>
                    {manager}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isManagerBackfill && (
              <FieldHint>Backfill — record is currently unattributed.</FieldHint>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="workflowReason">Reason for change</FieldLabel>
            <textarea
              id="workflowReason"
              value={draft.reason}
              onChange={(event) => updateDraft('reason', event.target.value)}
              className="min-h-[88px] p-3 border border-neutral/30 rounded-card bg-card text-body focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
              placeholder="e.g. ID document verified in branch on 2026-05-18; advancing to APPROVED."
              required
            />
            <FieldHint>Required for audit.</FieldHint>
          </Field>

          {submitError !== null && <FieldError>{submitError}</FieldError>}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              Record amendment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
