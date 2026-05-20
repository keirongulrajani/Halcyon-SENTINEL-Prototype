import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRecords } from '@/ui/hooks/use-records';
import { useAllFindings } from '@/ui/hooks/use-findings';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { ALL_BRANCHES } from '@/domain/types';
import type { Branch, ClientRecord } from '@/domain/types';
import { cn } from '@/ui/components/utils';
import { AlertTriangle, ChevronRight, ClipboardList, FileText, ShieldAlert } from 'lucide-react';

interface KpiTileProps {
  readonly label: string;
  readonly value: number;
  readonly tone: 'neutral' | 'warning' | 'error';
  readonly icon: React.ReactNode;
  readonly href?: string;
}

function KpiTile({ label, value, tone, icon, href }: KpiTileProps) {
  const valueColor =
    tone === 'error' ? 'text-error' : tone === 'warning' ? 'text-warning' : 'text-primary';
  const cardClasses = cn(
    'flex flex-col gap-3 h-full transition-shadow',
    href !== undefined && 'hover:shadow-md cursor-pointer',
  );
  const content = (
    <Card className={cardClasses}>
      <div className="flex items-center justify-between">
        <span className="text-label uppercase tracking-wide">{label}</span>
        <span
          className={cn(
            'p-2 rounded-card',
            tone === 'error' ? 'bg-error/10' : tone === 'warning' ? 'bg-warning/10' : 'bg-primary/10',
          )}
        >
          {icon}
        </span>
      </div>
      <span className={cn('text-kpi tabular', valueColor)}>{value}</span>
      {href !== undefined && (
        <span className="text-label text-neutral inline-flex items-center gap-1">
          View details
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </span>
      )}
    </Card>
  );
  return href !== undefined ? (
    <Link
      to={href}
      className="no-underline focus-visible:outline-2 focus-visible:outline-primary rounded-card block"
      aria-label={`${label}: ${value}. View details.`}
    >
      {content}
    </Link>
  ) : (
    content
  );
}

function countByBranch(records: readonly ClientRecord[]): Record<Branch, number> {
  const counts: Record<Branch, number> = {
    Mayfair: 0,
    Edinburgh: 0,
    Manchester: 0,
    'Canary Wharf': 0,
  };
  for (const record of records) counts[record.branch] += 1;
  return counts;
}

function findingsCountByBranch(
  records: readonly ClientRecord[],
  findingClientIds: ReadonlySet<string>,
): Record<Branch, number> {
  const counts: Record<Branch, number> = {
    Mayfair: 0,
    Edinburgh: 0,
    Manchester: 0,
    'Canary Wharf': 0,
  };
  for (const record of records) {
    if (findingClientIds.has(record.clientId)) counts[record.branch] += 1;
  }
  return counts;
}

export function DashboardPage() {
  const records = useRecords();
  const findings = useAllFindings();

  const highRiskCount = useMemo(
    () => records.filter((record) => record.storedRiskClassification === 'HIGH').length,
    [records],
  );

  const eddPendingCount = useMemo(
    () => records.filter((record) => record.kycStatus === 'ENHANCED_DUE_DILIGENCE').length,
    [records],
  );

  const findingClientIds = useMemo(
    () => new Set(findings.map((finding) => finding.clientId)),
    [findings],
  );

  const recordsByBranch = useMemo(() => countByBranch(records), [records]);
  const findingsByBranch = useMemo(
    () => findingsCountByBranch(records, findingClientIds),
    [records, findingClientIds],
  );

  return (
    <div className="flex flex-col gap-card-gap">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Onboarding overview</h1>
        <p className="text-body text-neutral">
          {records.length} client {records.length === 1 ? 'record' : 'records'} loaded across {ALL_BRANCHES.length} branches.
        </p>
      </header>

      <section
        aria-label="Headline indicators"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-card-gap"
      >
        <KpiTile
          label="Total records"
          value={records.length}
          tone="neutral"
          icon={<FileText className="size-5 text-primary" aria-hidden="true" />}
          href="/records"
        />
        <KpiTile
          label="Records with findings"
          value={findingClientIds.size}
          tone="error"
          icon={<AlertTriangle className="size-5 text-error" aria-hidden="true" />}
          href="/findings"
        />
        <KpiTile
          label="High risk"
          value={highRiskCount}
          tone="warning"
          icon={<ShieldAlert className="size-5 text-warning" aria-hidden="true" />}
          href="/records?tier=HIGH"
        />
        <KpiTile
          label="EDD in progress"
          value={eddPendingCount}
          tone="neutral"
          icon={<ClipboardList className="size-5 text-primary" aria-hidden="true" />}
          href="/records?kyc=ENHANCED_DUE_DILIGENCE"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Findings by branch</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th className="text-label py-2">Branch</th>
                <th className="text-label py-2 text-right">Records</th>
                <th className="text-label py-2 text-right">Findings</th>
              </tr>
            </thead>
            <tbody>
              {ALL_BRANCHES.map((branch) => {
                const branchFindingCount = findingsByBranch[branch];
                const branchRecordCount = recordsByBranch[branch];
                const branchRecordsHref = `/records?branch=${encodeURIComponent(branch)}`;
                const branchFindingsHref = `/records?branch=${encodeURIComponent(branch)}&findings=only`;
                return (
                  <tr key={branch} className="border-t border-neutral/15 hover:bg-primary/5">
                    <td className="py-3 text-body">
                      <Link
                        to={branchRecordsHref}
                        className="text-primary no-underline hover:underline"
                      >
                        {branch}
                      </Link>
                    </td>
                    <td className="py-3 text-body tabular text-right">
                      <Link
                        to={branchRecordsHref}
                        className="text-primary no-underline hover:underline"
                      >
                        {branchRecordCount}
                      </Link>
                    </td>
                    <td className="py-3 text-body tabular text-right">
                      {branchFindingCount > 0 ? (
                        <Link
                          to={branchFindingsHref}
                          className="text-error font-medium no-underline hover:underline"
                        >
                          {branchFindingCount}
                        </Link>
                      ) : (
                        <span className="text-neutral">{branchFindingCount}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
