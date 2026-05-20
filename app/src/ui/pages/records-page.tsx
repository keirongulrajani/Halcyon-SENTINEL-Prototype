import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useRecords } from '@/ui/hooks/use-records';
import { useFindingsByClientId, useRecordFindingsCounts } from '@/ui/hooks/use-findings';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { RiskBadge } from '@/ui/components/risk-badge';
import { KycStatusBadge } from '@/ui/components/kyc-status-badge';
import { MissingFieldIndicator } from '@/ui/components/missing-field-indicator';
import { FindingsSummary } from '@/ui/components/findings-summary';
import { Switch } from '@/ui/components/switch';
import { Label } from '@/ui/components/label';
import { Button } from '@/ui/components/button';
import { BulkImportDialog } from '@/ui/components/bulk-import-dialog';
import { ALL_BRANCHES, ALL_KYC_STATUSES, ALL_RISK_TIERS } from '@/domain/types';
import type { Branch, ClientRecord, KycStatus, RiskTier } from '@/domain/types';
import { formatDate } from '@/ui/format';
import { cn } from '@/ui/components/utils';

type FilterSet<T> = ReadonlySet<T>;

function buildFilterFromParam<T extends string>(
  paramValues: readonly string[],
  allowed: readonly T[],
): Set<T> {
  const result = new Set<T>();
  for (const value of paramValues) {
    if ((allowed as readonly string[]).includes(value)) {
      result.add(value as T);
    }
  }
  return result;
}

function toggleInSet<T>(set: FilterSet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

function matchesFilters(
  record: ClientRecord,
  branches: FilterSet<Branch>,
  tiers: FilterSet<RiskTier>,
  statuses: FilterSet<KycStatus>,
): boolean {
  if (branches.size > 0 && !branches.has(record.branch)) return false;
  if (tiers.size > 0 && !tiers.has(record.storedRiskClassification)) return false;
  if (statuses.size > 0 && !statuses.has(record.kycStatus)) return false;
  return true;
}

interface FilterChipsProps<T extends string> {
  readonly label: string;
  readonly options: readonly T[];
  readonly selected: FilterSet<T>;
  readonly onToggle: (value: T) => void;
}

function FilterChips<T extends string>({ label, options, selected, onToggle }: FilterChipsProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = selected.has(option);
          return (
            <Button
              key={option}
              size="sm"
              variant={isActive ? 'primary' : 'secondary'}
              onClick={() => onToggle(option)}
              aria-pressed={isActive}
            >
              {option}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function RecordsPage() {
  const records = useRecords();
  const findingCounts = useRecordFindingsCounts();
  const findingsByClientId = useFindingsByClientId();
  const [searchParams] = useSearchParams();

  const initialBranches = useMemo(
    () => buildFilterFromParam<Branch>(searchParams.getAll('branch'), ALL_BRANCHES),
    [searchParams],
  );
  const initialTiers = useMemo(
    () => buildFilterFromParam<RiskTier>(searchParams.getAll('tier'), ALL_RISK_TIERS),
    [searchParams],
  );
  const initialStatuses = useMemo(
    () => buildFilterFromParam<KycStatus>(searchParams.getAll('kyc'), ALL_KYC_STATUSES),
    [searchParams],
  );
  const initialOnlyFindings = searchParams.get('findings') === 'only';

  const [selectedBranches, setSelectedBranches] = useState<FilterSet<Branch>>(initialBranches);
  const [selectedTiers, setSelectedTiers] = useState<FilterSet<RiskTier>>(initialTiers);
  const [selectedStatuses, setSelectedStatuses] = useState<FilterSet<KycStatus>>(initialStatuses);
  const [onlyWithFindings, setOnlyWithFindings] = useState(initialOnlyFindings);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const visibleRecords = useMemo(
    () =>
      records.filter((record) => {
        if (!matchesFilters(record, selectedBranches, selectedTiers, selectedStatuses)) return false;
        if (onlyWithFindings && (findingCounts.get(record.clientId) ?? 0) === 0) return false;
        return true;
      }),
    [records, selectedBranches, selectedTiers, selectedStatuses, onlyWithFindings, findingCounts],
  );

  const recordsWithFindingsCount = useMemo(
    () => records.filter((record) => (findingCounts.get(record.clientId) ?? 0) > 0).length,
    [records, findingCounts],
  );

  return (
    <div className="flex flex-col gap-card-gap">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-h1">Records</h1>
          <p className="text-body text-neutral">
            {visibleRecords.length} of {records.length} shown.{' '}
            {recordsWithFindingsCount > 0 && (
              <span className="text-error">
                {recordsWithFindingsCount} {recordsWithFindingsCount === 1 ? 'record has' : 'records have'} findings.
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
            Import CSV
          </Button>
          <Link to="/intake">
            <Button>New assessment</Button>
          </Link>
        </div>
      </header>

      <BulkImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <FilterChips
            label="Branch"
            options={ALL_BRANCHES}
            selected={selectedBranches}
            onToggle={(value) => setSelectedBranches((prev) => toggleInSet(prev, value))}
          />
          <FilterChips
            label="Risk tier"
            options={ALL_RISK_TIERS}
            selected={selectedTiers}
            onToggle={(value) => setSelectedTiers((prev) => toggleInSet(prev, value))}
          />
          <FilterChips
            label="KYC status"
            options={ALL_KYC_STATUSES}
            selected={selectedStatuses}
            onToggle={(value) => setSelectedStatuses((prev) => toggleInSet(prev, value))}
          />
          <div className="flex items-center gap-3 pt-2 border-t border-neutral/15">
            <Switch
              id="only-findings"
              checked={onlyWithFindings}
              onCheckedChange={setOnlyWithFindings}
            />
            <Label htmlFor="only-findings" className="cursor-pointer">
              Show only records with findings
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-primary/5">
                <th className="text-label py-3 px-4 text-left">Client</th>
                <th className="text-label py-3 px-4 text-left">Branch</th>
                <th className="text-label py-3 px-4 text-left">Date</th>
                <th className="text-label py-3 px-4 text-left">Risk</th>
                <th className="text-label py-3 px-4 text-left">KYC</th>
                <th className="text-label py-3 px-4 text-left">RM</th>
                <th className="text-label py-3 px-4 text-left">Findings</th>
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record) => {
                const findingCount = findingCounts.get(record.clientId) ?? 0;
                const hasFindings = findingCount > 0;
                const isSuperseded = record.supersededBy !== undefined;
                return (
                  <tr
                    key={record.clientId}
                    className={cn(
                      'border-t border-neutral/15 hover:bg-primary/5',
                      hasFindings && !isSuperseded && 'border-l-4 border-l-error',
                      isSuperseded && 'opacity-60',
                    )}
                  >
                    <td className="py-3 px-4">
                      <Link
                        to={`/records/${record.clientId}`}
                        className="text-primary no-underline hover:underline flex flex-col"
                      >
                        <span className="text-body font-medium tabular">{record.clientId}</span>
                        <span className="text-label text-neutral font-normal">
                          {record.clientName}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-body">{record.branch}</td>
                    <td className="py-3 px-4 text-body tabular">
                      {formatDate(record.onboardingDate)}
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge tier={record.storedRiskClassification} />
                    </td>
                    <td className="py-3 px-4">
                      <KycStatusBadge status={record.kycStatus} />
                    </td>
                    <td className="py-3 px-4 text-body">
                      {record.relationshipManager === null ? (
                        <MissingFieldIndicator fieldLabel="Relationship manager" />
                      ) : (
                        record.relationshipManager
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isSuperseded ? (
                        <Link
                          to={`/records/${record.supersededBy ?? ''}`}
                          className="inline-flex items-center gap-1 text-label text-neutral hover:underline"
                        >
                          Superseded by <span className="tabular">{record.supersededBy}</span>
                        </Link>
                      ) : (
                        <FindingsSummary findings={findingsByClientId.get(record.clientId) ?? []} />
                      )}
                    </td>
                  </tr>
                );
              })}
              {visibleRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral">
                    No records match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
