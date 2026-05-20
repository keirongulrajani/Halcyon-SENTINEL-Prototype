import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useRecord } from '@/ui/hooks/use-records';
import { useFindingsForRecord } from '@/ui/hooks/use-findings';
import { useServices } from '@/ui/providers/services-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { RiskBadge } from '@/ui/components/risk-badge';
import { KycStatusBadge } from '@/ui/components/kyc-status-badge';
import { Button } from '@/ui/components/button';
import { Badge } from '@/ui/components/badge';
import { FindingsBanner } from '@/ui/components/findings-banner';
import { ValueOrMissing } from '@/ui/components/value-or-missing';
import { MissingFieldIndicator } from '@/ui/components/missing-field-indicator';
import { UpdateWorkflowDialog } from '@/ui/components/update-workflow-dialog';
import { AuditTrailPanel } from '@/ui/components/audit-trail-panel';
import { formatCurrency, formatDate, formatDateTime } from '@/ui/format';
import type { ClientRecord, Verdict } from '@/domain/types';
import { AlertTriangle, ArrowLeft, History, RotateCw } from 'lucide-react';

interface DataRowProps {
  readonly label: string;
  readonly children: React.ReactNode;
}

function DataRow({ label, children }: DataRowProps) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 py-2 border-b border-neutral/10 last:border-0">
      <span className="text-label">{label}</span>
      <div className="text-body">{children}</div>
    </div>
  );
}

function BooleanCell({ value }: { readonly value: boolean }) {
  return value ? (
    <Badge variant="high">Yes</Badge>
  ) : (
    <span className="text-neutral">No</span>
  );
}

interface VerdictPanelProps {
  readonly title: string;
  readonly verdict: Verdict;
  readonly rulesVersionNote?: string;
}

function VerdictPanel({ title, verdict, rulesVersionNote }: VerdictPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-label">{title}</span>
        <RiskBadge tier={verdict.tier} />
      </div>
      {verdict.firedRules.length === 0 ? (
        <p className="text-body text-neutral m-0">
          No HIGH or MEDIUM rules fired — defaults to LOW.
        </p>
      ) : (
        <ul className="m-0 p-0 list-none flex flex-col gap-1">
          {verdict.firedRules.map((rule) => (
            <li key={rule.ruleId} className="flex items-start gap-2">
              <span className="text-label tabular text-neutral mt-0.5">{rule.tier}</span>
              <span className="text-body">{rule.predicateLabel}</span>
            </li>
          ))}
        </ul>
      )}
      {verdict.requiredActions.length > 0 && (
        <div className="flex flex-col gap-1 pt-2 border-t border-neutral/10">
          <span className="text-label">Required actions</span>
          <ul className="m-0 pl-5 flex flex-col gap-1 text-body">
            {verdict.requiredActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      )}
      <span className="text-label text-neutral">
        Rules version: <span className="tabular">{verdict.rulesVersion}</span>
        {rulesVersionNote && <span> · {rulesVersionNote}</span>}
      </span>
    </div>
  );
}

interface StoredVsCurrentRulesProps {
  readonly record: ClientRecord;
}

function StoredVerdictPanel({ record }: StoredVsCurrentRulesProps) {
  const { findingsService } = useServices();
  const liveVerdict = useMemo(() => findingsService.verdictForRecord(record), [findingsService, record]);
  const [showCurrentRules, setShowCurrentRules] = useState(false);

  const storedVerdict: Verdict = {
    tier: record.storedRiskClassification,
    firedRules: [],
    requiredActions: [],
    rulesVersion: record.rulesVersion ?? 'unrecorded (legacy CSV record)',
  };

  const verdictsAgree = liveVerdict.tier === record.storedRiskClassification;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Verdict</CardTitle>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowCurrentRules((prev) => !prev)}
          >
            <RotateCw className="size-4" aria-hidden="true" />
            {showCurrentRules ? 'Hide current-rules check' : 'Re-evaluate against current rules'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <VerdictPanel
          title="As recorded at intake"
          verdict={storedVerdict}
          rulesVersionNote="immutable point-in-time snapshot"
        />
        {showCurrentRules && (
          <div className="pt-4 border-t border-neutral/15">
            <VerdictPanel title="Current rules would classify as" verdict={liveVerdict} />
            {!verdictsAgree && (
              <p className="mt-3 p-3 bg-error/5 text-error text-body rounded-card">
                Stored verdict ({record.storedRiskClassification}) and current-rules verdict ({liveVerdict.tier})
                disagree. This record requires re-classification under the latest regulatory criteria.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RecordDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const record = useRecord(clientId ?? '');
  const findings = useFindingsForRecord(clientId ?? '');
  const [isUpdateWorkflowOpen, setIsUpdateWorkflowOpen] = useState(false);

  if (record === null) {
    return (
      <div className="flex flex-col gap-3">
        <Link to="/records" className="text-primary inline-flex items-center gap-1">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to records
        </Link>
        <Card>
          <CardContent>
            <p className="text-body">Record not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requiresIdVerification = record.kycStatus === 'APPROVED';
  const isSuperseded = record.supersededBy !== undefined;
  const supersedesPrevious = record.supersedes !== undefined;

  return (
    <div className="flex flex-col gap-card-gap">
      <Link to="/records" className="text-primary inline-flex items-center gap-1 no-underline hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to records
      </Link>

      {isSuperseded && record.supersededBy !== undefined && (
        <div className="surface-card border-l-4 border-warning bg-warning-tint p-4 flex items-start gap-3">
          <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <p className="m-0 text-body">
              This record was superseded by{' '}
              <span className="tabular font-medium">{record.supersededBy}</span> on{' '}
              <span className="tabular">{formatDate(record.assessedAt ?? record.onboardingDate)}</span>.
              Read-only — open the superseding record to view current state.
            </p>
            <Link
              to={`/records/${record.supersededBy}`}
              className="text-primary text-label inline-block mt-1 hover:underline"
            >
              View superseding record →
            </Link>
          </div>
        </div>
      )}

      {supersedesPrevious && record.supersedes !== undefined && (
        <div className="bg-primary-tint rounded-card p-3 flex items-start gap-2">
          <History className="size-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p className="m-0 text-label text-text">
            This record supersedes{' '}
            <span className="tabular font-medium">{record.supersedes}</span>.{' '}
            <Link to={`/records/${record.supersedes}`} className="text-primary hover:underline">
              View the previous version →
            </Link>
          </p>
        </div>
      )}

      <header className="flex flex-col gap-1">
        <h1 className="text-h1">
          <span className="tabular">{record.clientId}</span> · {record.clientName}
        </h1>
        <p className="text-body text-neutral">
          {record.branch} · Onboarded {formatDate(record.onboardingDate)}
        </p>
      </header>

      <FindingsBanner findings={findings} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-card-gap items-start">
        <div className="lg:col-span-2 flex flex-col gap-card-gap">
          <Card>
            <CardHeader>
              <CardTitle>Client details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
              <DataRow label="Client ID"><span className="tabular">{record.clientId}</span></DataRow>
              <DataRow label="Name">{record.clientName}</DataRow>
              <DataRow label="Type">{record.clientType}</DataRow>
              <DataRow label="Country of tax residence">{record.countryOfTaxResidence}</DataRow>
              <DataRow label="Annual income">
                <span className="tabular">{formatCurrency(record.annualIncome)}</span>
              </DataRow>
              <DataRow label="Source of funds">{record.sourceOfFunds}</DataRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk indicators</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
              <DataRow label="PEP status"><BooleanCell value={record.pepStatus} /></DataRow>
              <DataRow label="Sanctions match"><BooleanCell value={record.sanctionsScreeningMatch} /></DataRow>
              <DataRow label="Adverse media"><BooleanCell value={record.adverseMediaFlag} /></DataRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compliance state</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
              <DataRow label="KYC status"><KycStatusBadge status={record.kycStatus} /></DataRow>
              <DataRow label="ID verification date">
                <ValueOrMissing
                  value={record.idVerificationDate}
                  fieldLabel="ID verification date"
                  required={requiresIdVerification}
                  render={(value) => <span className="tabular">{formatDate(value as string)}</span>}
                />
              </DataRow>
              <DataRow label="Documentation complete">
                {record.documentationComplete ? (
                  <Badge variant="low">Complete</Badge>
                ) : (
                  <Badge variant="medium">Incomplete</Badge>
                )}
              </DataRow>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-card-gap">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsUpdateWorkflowOpen(true)}
                disabled={isSuperseded}
              >
                Update workflow state
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/intake?supersedes=${record.clientId}`)}
                disabled={isSuperseded}
              >
                Re-assess this client
              </Button>
              {isSuperseded && (
                <p className="m-0 text-label">
                  Actions disabled — this record has been superseded.
                </p>
              )}
            </CardContent>
          </Card>

          <StoredVerdictPanel record={record} />

          <Card>
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
              <DataRow label="Assessed by">
                {record.relationshipManager === null ? (
                  <MissingFieldIndicator fieldLabel="Relationship manager" />
                ) : (
                  record.relationshipManager
                )}
              </DataRow>
              <DataRow label="Assessed at">
                <span className="tabular">{formatDateTime(record.assessedAt ?? record.onboardingDate)}</span>
              </DataRow>
              <DataRow label="Rules version">
                <span className="tabular text-neutral">
                  {record.rulesVersion ?? 'pre-system record (CSV import)'}
                </span>
              </DataRow>
            </CardContent>
          </Card>

          <AuditTrailPanel record={record} />
        </div>
      </div>

      <UpdateWorkflowDialog
        record={record}
        open={isUpdateWorkflowOpen}
        onOpenChange={setIsUpdateWorkflowOpen}
      />
    </div>
  );
}
