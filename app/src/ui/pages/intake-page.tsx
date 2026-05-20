import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useServices } from '@/ui/providers/services-context';
import { useRecord } from '@/ui/hooks/use-records';
import { useVerdictPreview } from '@/ui/hooks/use-verdict-preview';
import type {
  AssessmentDraft,
  Branch,
  ClientType,
  KycStatus,
  SourceOfFunds,
} from '@/domain/types';
import {
  ALL_BRANCHES,
  ALL_CLIENT_TYPES,
  ALL_KYC_STATUSES,
  ALL_SOURCES_OF_FUNDS,
  EMPTY_DRAFT,
} from '@/domain/types';
import type { ValidationIssue, DraftFieldKey } from '@/domain/validation';
import { KNOWN_COUNTRIES } from '@/config/countries';
import { KNOWN_RELATIONSHIP_MANAGERS } from '@/config/relationship-managers';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Switch } from '@/ui/components/switch';
import { Label } from '@/ui/components/label';
import { Field, FieldError, FieldHint, FieldLabel } from '@/ui/components/field';
import { RiskBadge } from '@/ui/components/risk-badge';
import { Badge } from '@/ui/components/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/select';
import { cn } from '@/ui/components/utils';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';

type IssuesByField = ReadonlyMap<DraftFieldKey | 'workflow', string>;

function indexIssues(issues: readonly ValidationIssue[] | null): IssuesByField {
  if (issues === null) return new Map();
  const map = new Map<DraftFieldKey | 'workflow', string>();
  for (const issue of issues) {
    if (!map.has(issue.field)) map.set(issue.field, issue.message);
  }
  return map;
}

function draftFromRecord(record: {
  readonly branch: Branch;
  readonly clientName: string;
  readonly clientType: ClientType;
  readonly countryOfTaxResidence: string;
  readonly annualIncome: number;
  readonly sourceOfFunds: SourceOfFunds;
  readonly pepStatus: boolean;
  readonly sanctionsScreeningMatch: boolean;
  readonly adverseMediaFlag: boolean;
  readonly kycStatus: KycStatus;
  readonly idVerificationDate: string | null;
  readonly relationshipManager: string | null;
  readonly documentationComplete: boolean;
}): AssessmentDraft {
  return {
    branch: record.branch,
    clientName: record.clientName,
    clientType: record.clientType,
    countryOfTaxResidence: record.countryOfTaxResidence,
    annualIncome: record.annualIncome,
    sourceOfFunds: record.sourceOfFunds,
    pepStatus: record.pepStatus,
    sanctionsScreeningMatch: record.sanctionsScreeningMatch,
    adverseMediaFlag: record.adverseMediaFlag,
    kycStatus: record.kycStatus,
    idVerificationDate: record.idVerificationDate,
    relationshipManager: record.relationshipManager,
    documentationComplete: record.documentationComplete,
  };
}

export function IntakePage() {
  const { assessmentService } = useServices();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const supersedesClientId = searchParams.get('supersedes');
  const supersededRecord = useRecord(supersedesClientId ?? '');
  const isSupersedingMode = supersedesClientId !== null && supersededRecord !== null;

  const [draft, setDraft] = useState<AssessmentDraft>(EMPTY_DRAFT);
  const [supersedeReason, setSupersedeReason] = useState('');
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [submitIssues, setSubmitIssues] = useState<readonly ValidationIssue[] | null>(null);

  useEffect(() => {
    if (isSupersedingMode && !hasPrefilled && supersededRecord !== null) {
      setDraft(draftFromRecord(supersededRecord));
      setHasPrefilled(true);
    }
  }, [isSupersedingMode, hasPrefilled, supersededRecord]);

  const issuesByField = useMemo(() => indexIssues(submitIssues), [submitIssues]);
  const verdict = useVerdictPreview(draft);
  const wouldBeBlockedByWorkflow =
    verdict.tier === 'HIGH' && draft.kycStatus === 'APPROVED';

  const updateDraft = <K extends keyof AssessmentDraft>(field: K, value: AssessmentDraft[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const supersedeContext =
      isSupersedingMode && supersedesClientId !== null
        ? { originalClientId: supersedesClientId, reason: supersedeReason }
        : undefined;
    const result = assessmentService.submit(draft, supersedeContext);
    if (result.ok) {
      setSubmitIssues(null);
      navigate(`/records/${result.value.clientId}`);
    } else {
      setSubmitIssues(result.error);
    }
  };

  const requiresIdVerification = draft.kycStatus === 'APPROVED';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-card-gap" noValidate>
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-h1">
            {isSupersedingMode ? 'Re-assess client' : 'New onboarding assessment'}
          </h1>
          <p className="text-body text-neutral">
            {isSupersedingMode
              ? 'Creates a new record that supersedes the original. The original stays read-only for audit history.'
              : 'Capture client details. Risk classification is derived automatically — not entered.'}
          </p>
        </div>
        <Button type="submit" size="default">
          {isSupersedingMode ? 'Submit superseding assessment' : 'Submit assessment'}
        </Button>
      </header>

      {isSupersedingMode && supersededRecord !== null && (
        <div className="surface-card border-l-4 border-warning p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="m-0 text-body">
                <strong className="font-medium">Superseding {supersededRecord.clientId} — {supersededRecord.clientName}.</strong>
                {' '}Form pre-filled with that record's data. Make any corrections needed. On submit, a new record will be created with a link back to the original.
              </p>
              <Link
                to={`/records/${supersededRecord.clientId}`}
                className="text-primary text-label inline-block mt-1 hover:underline"
              >
                View the original record →
              </Link>
            </div>
          </div>
          <Field>
            <FieldLabel htmlFor="supersedeReason">Reason for re-assessment</FieldLabel>
            <textarea
              id="supersedeReason"
              value={supersedeReason}
              onChange={(event) => setSupersedeReason(event.target.value)}
              className="min-h-[88px] p-3 border border-neutral/30 rounded-card focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary text-body"
              placeholder="e.g. Adverse media surfaced post-intake; re-classifying under enhanced due diligence."
              required
            />
            <FieldHint>Recorded in the audit log alongside the new record.</FieldHint>
          </Field>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-card-gap items-start">
        <div className="flex flex-col gap-card-gap">
          <Card>
            <CardHeader>
              <CardTitle>Client details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="branch">Branch</FieldLabel>
                <Select
                  value={draft.branch ?? ''}
                  onValueChange={(value) => updateDraft('branch', value as Branch)}
                >
                  <SelectTrigger id="branch" aria-invalid={issuesByField.has('branch')}>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_BRANCHES.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {issuesByField.get('branch') && <FieldError>{issuesByField.get('branch')}</FieldError>}
              </Field>

              <Field>
                <FieldLabel htmlFor="clientName">Client name</FieldLabel>
                <Input
                  id="clientName"
                  value={draft.clientName}
                  onChange={(event) => updateDraft('clientName', event.target.value)}
                  aria-invalid={issuesByField.has('clientName')}
                  autoComplete="off"
                />
                {issuesByField.get('clientName') && (
                  <FieldError>{issuesByField.get('clientName')}</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="clientType">Client type</FieldLabel>
                <Select
                  value={draft.clientType ?? ''}
                  onValueChange={(value) => updateDraft('clientType', value as ClientType)}
                >
                  <SelectTrigger id="clientType" aria-invalid={issuesByField.has('clientType')}>
                    <SelectValue placeholder="Individual or entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_CLIENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {issuesByField.get('clientType') && (
                  <FieldError>{issuesByField.get('clientType')}</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="country">Country of tax residence</FieldLabel>
                <Select
                  value={draft.countryOfTaxResidence}
                  onValueChange={(value) => updateDraft('countryOfTaxResidence', value)}
                >
                  <SelectTrigger
                    id="country"
                    aria-invalid={issuesByField.has('countryOfTaxResidence')}
                  >
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWN_COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldHint>Constrained list — typos cannot silently miss a HIGH-risk country.</FieldHint>
                {issuesByField.get('countryOfTaxResidence') && (
                  <FieldError>{issuesByField.get('countryOfTaxResidence')}</FieldError>
                )}
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk data points</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="annualIncome">Annual income (GBP)</FieldLabel>
                  <Input
                    id="annualIncome"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={draft.annualIncome ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      updateDraft('annualIncome', raw === '' ? null : Number(raw));
                    }}
                    aria-invalid={issuesByField.has('annualIncome')}
                  />
                  {issuesByField.get('annualIncome') && (
                    <FieldError>{issuesByField.get('annualIncome')}</FieldError>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="source">Source of funds</FieldLabel>
                  <Select
                    value={draft.sourceOfFunds ?? ''}
                    onValueChange={(value) =>
                      updateDraft('sourceOfFunds', value as SourceOfFunds)
                    }
                  >
                    <SelectTrigger id="source" aria-invalid={issuesByField.has('sourceOfFunds')}>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_SOURCES_OF_FUNDS.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {issuesByField.get('sourceOfFunds') && (
                    <FieldError>{issuesByField.get('sourceOfFunds')}</FieldError>
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-neutral/15">
                <BooleanRow
                  id="pep"
                  label="Politically Exposed Person"
                  hint="Triggers HIGH risk + EDD"
                  checked={draft.pepStatus}
                  onChange={(value) => updateDraft('pepStatus', value)}
                />
                <BooleanRow
                  id="sanctions"
                  label="Sanctions match (HMT / OFSI)"
                  hint="Triggers HIGH risk"
                  checked={draft.sanctionsScreeningMatch}
                  onChange={(value) => updateDraft('sanctionsScreeningMatch', value)}
                />
                <BooleanRow
                  id="adverse"
                  label="Adverse media flag"
                  hint="Triggers HIGH risk"
                  checked={draft.adverseMediaFlag}
                  onChange={(value) => updateDraft('adverseMediaFlag', value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance state</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="kycStatus">KYC status</FieldLabel>
                <Select
                  value={draft.kycStatus}
                  onValueChange={(value) => updateDraft('kycStatus', value as KycStatus)}
                >
                  <SelectTrigger id="kycStatus">
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
                {wouldBeBlockedByWorkflow && (
                  <FieldError>
                    HIGH-risk clients cannot be APPROVED directly. Set to ENHANCED_DUE_DILIGENCE.
                  </FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="idVerificationDate">
                  ID verification date{' '}
                  {requiresIdVerification && <span className="text-error">*</span>}
                </FieldLabel>
                <Input
                  id="idVerificationDate"
                  type="date"
                  value={draft.idVerificationDate ?? ''}
                  onChange={(event) =>
                    updateDraft('idVerificationDate', event.target.value === '' ? null : event.target.value)
                  }
                  aria-invalid={issuesByField.has('idVerificationDate')}
                />
                <FieldHint>
                  {requiresIdVerification
                    ? 'Required when KYC status is APPROVED.'
                    : 'Optional unless KYC status is APPROVED.'}
                </FieldHint>
                {issuesByField.get('idVerificationDate') && (
                  <FieldError>{issuesByField.get('idVerificationDate')}</FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="rm">Relationship manager</FieldLabel>
                <Select
                  value={draft.relationshipManager ?? ''}
                  onValueChange={(value) => updateDraft('relationshipManager', value)}
                >
                  <SelectTrigger id="rm" aria-invalid={issuesByField.has('relationshipManager')}>
                    <SelectValue placeholder="Select RM" />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWN_RELATIONSHIP_MANAGERS.map((rm) => (
                      <SelectItem key={rm} value={rm}>
                        {rm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldHint>Required — every assessment must be attributable.</FieldHint>
                {issuesByField.get('relationshipManager') && (
                  <FieldError>{issuesByField.get('relationshipManager')}</FieldError>
                )}
              </Field>

              <BooleanRow
                id="docs"
                label="Documentation complete"
                hint="All required documents collected and on file"
                checked={draft.documentationComplete}
                onChange={(value) => updateDraft('documentationComplete', value)}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-4 flex flex-col gap-card-gap">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Live verdict</CardTitle>
                <RiskBadge tier={verdict.tier} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {verdict.firedRules.length === 0 ? (
                <p className="m-0 text-body text-neutral">
                  No rules fired — defaults to LOW risk.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-label">Triggered by</span>
                  <ul className="m-0 p-0 list-none flex flex-col gap-1">
                    {verdict.firedRules.map((rule) => (
                      <li key={rule.ruleId} className="flex items-start gap-2 text-body">
                        <Badge variant={rule.tier === 'HIGH' ? 'high' : 'medium'} className="shrink-0">
                          {rule.tier}
                        </Badge>
                        <span>{rule.predicateLabel}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {verdict.requiredActions.length > 0 && (
                <div className="flex flex-col gap-1 pt-2 border-t border-neutral/10">
                  <span className="text-label">Required actions</span>
                  <ul className="m-0 pl-5 text-body flex flex-col gap-1">
                    {verdict.requiredActions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t border-neutral/10 text-label text-neutral">
                Rules version: <span className="tabular">{verdict.rulesVersion}</span>
              </div>
            </CardContent>
          </Card>

          {wouldBeBlockedByWorkflow && (
            <div className="surface-card border-l-4 border-error p-3 flex items-start gap-2">
              <AlertTriangle className="size-5 text-error shrink-0 mt-0.5" aria-hidden="true" />
              <p className="m-0 text-body">
                HIGH-risk clients require Enhanced Due Diligence and senior compliance sign-off
                before approval. Change KYC status to ENHANCED_DUE_DILIGENCE.
              </p>
            </div>
          )}

          {submitIssues !== null && submitIssues.length > 0 && (
            <div
              role="alert"
              className="surface-card border-l-4 border-error p-3 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-error" aria-hidden="true" />
                <strong className="text-body">Cannot submit — {submitIssues.length} issue{submitIssues.length === 1 ? '' : 's'}</strong>
              </div>
              <ul className="m-0 pl-5 text-body flex flex-col gap-1">
                {submitIssues.map((issue, index) => (
                  <li key={`${issue.field}-${index}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}

          {submitIssues === null && (
            <div className={cn('surface-card border-l-4 p-3 flex items-start gap-2', wouldBeBlockedByWorkflow ? 'border-warning' : 'border-success')}>
              {wouldBeBlockedByWorkflow ? (
                <ShieldCheck className="size-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <p className="m-0 text-body">
                {wouldBeBlockedByWorkflow
                  ? 'Resolve the workflow check above before submitting.'
                  : 'Complete all required fields, then submit. The rules engine records its verdict and reasons with the new record.'}
              </p>
            </div>
          )}
        </aside>
      </div>
    </form>
  );
}

interface BooleanRowProps {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly checked: boolean;
  readonly onChange: (value: boolean) => void;
}

function BooleanRow({ id, label, hint, checked, onChange }: BooleanRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
        <Label htmlFor={id} className="cursor-pointer flex-1">
          {label}
        </Label>
      </div>
      <span className="text-label text-neutral pl-[60px]">{hint}</span>
    </div>
  );
}
