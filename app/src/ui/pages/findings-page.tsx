import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAllFindings } from '@/ui/hooks/use-findings';
import { useRecords } from '@/ui/hooks/use-records';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { FindingSeverityBadge } from '@/ui/components/finding-severity-badge';
import { groupFindingsBySeverity } from '@/domain/findings';
import type { Finding, FindingSeverity } from '@/domain/types';
import { cn } from '@/ui/components/utils';
import { ShieldAlert, AlertOctagon, AlertTriangle, FileWarning } from 'lucide-react';

const SEVERITY_PRESENTATION: Record<
  FindingSeverity,
  { readonly heading: string; readonly description: string; readonly accent: string; readonly icon: React.ReactNode }
> = {
  CLASSIFICATION_MISMATCH: {
    heading: 'Classification mismatches',
    description:
      'Records where the stored risk classification disagrees with what the regulatory rules imply.',
    accent: 'border-error text-error',
    icon: <AlertOctagon className="size-5" aria-hidden="true" />,
  },
  WORKFLOW_VIOLATION: {
    heading: 'Workflow violations',
    description:
      'Records whose workflow state is inconsistent with the firm’s approval rules (e.g. HIGH approved without EDD).',
    accent: 'border-warning text-warning',
    icon: <ShieldAlert className="size-5" aria-hidden="true" />,
  },
  MISSING_FIELD: {
    heading: 'Missing required fields',
    description:
      'Records missing fields required for a complete audit trail (relationship manager, ID verification date).',
    accent: 'border-primary text-primary',
    icon: <FileWarning className="size-5" aria-hidden="true" />,
  },
};

interface FindingRowProps {
  readonly finding: Finding;
  readonly clientName: string | undefined;
}

function FindingRow({ finding, clientName }: FindingRowProps) {
  return (
    <li className="flex flex-col gap-1 p-4 border-l-4 border-neutral/20 bg-background rounded-r-card">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link
          to={`/records/${finding.clientId}`}
          className="text-primary no-underline hover:underline text-body font-medium"
        >
          <span className="tabular">{finding.clientId}</span>
          {clientName && <span className="text-neutral font-normal"> · {clientName}</span>}
        </Link>
        <FindingSeverityBadge severity={finding.severity} />
      </div>
      <p className="m-0 text-body">
        <strong className="font-medium">Rule violated.</strong> {finding.rule}
      </p>
      <p className="m-0 text-body">
        <strong className="font-medium">Detail.</strong> {finding.detail}
      </p>
      <p className="m-0 text-label text-neutral">
        <strong className="font-medium">Recommended action.</strong> {finding.recommendedAction}
      </p>
    </li>
  );
}

export function FindingsPage() {
  const findings = useAllFindings();
  const records = useRecords();

  const clientNameByClientId = useMemo(() => {
    const map = new Map<string, string>();
    for (const record of records) map.set(record.clientId, record.clientName);
    return map;
  }, [records]);

  const grouped = useMemo(() => groupFindingsBySeverity(findings), [findings]);

  const totalRecordsWithFindings = useMemo(
    () => new Set(findings.map((finding) => finding.clientId)).size,
    [findings],
  );

  return (
    <div className="flex flex-col gap-card-gap">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Audit findings</h1>
        <p className="text-body text-neutral">
          {findings.length} {findings.length === 1 ? 'finding' : 'findings'} across{' '}
          {totalRecordsWithFindings} {totalRecordsWithFindings === 1 ? 'record' : 'records'}.
          Grouped by severity. Each item links to the underlying record.
        </p>
      </header>

      {findings.length === 0 ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8">
            <AlertTriangle className="size-5 text-neutral" aria-hidden="true" />
            <p className="m-0 text-body text-neutral">No findings — every record is compliant.</p>
          </CardContent>
        </Card>
      ) : (
        (['CLASSIFICATION_MISMATCH', 'WORKFLOW_VIOLATION', 'MISSING_FIELD'] as const).map(
          (severity) => {
            const presentation = SEVERITY_PRESENTATION[severity];
            const bucket = grouped[severity];
            if (bucket.length === 0) return null;
            return (
              <Card key={severity}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={cn('p-2 rounded-card', presentation.accent.replace('border-', 'bg-').replace('text-', 'text-'))}>
                        {presentation.icon}
                      </span>
                      <div>
                        <CardTitle>{presentation.heading}</CardTitle>
                        <p className="text-label text-neutral m-0">{presentation.description}</p>
                      </div>
                    </div>
                    <span className="text-kpi tabular">{bucket.length}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-3 m-0 p-0 list-none">
                    {bucket.map((finding) => (
                      <FindingRow
                        key={finding.id}
                        finding={finding}
                        clientName={clientNameByClientId.get(finding.clientId)}
                      />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          },
        )
      )}
    </div>
  );
}
