import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { formatDateTime } from '@/ui/format';
import type {
  AmendmentEntry,
  ClientRecord,
  WorkflowStateChange,
} from '@/domain/types';

const MISSING_VALUE_GLYPH = '—';

function formatChangeValue(value: string | boolean | null): string {
  if (value === null) return MISSING_VALUE_GLYPH;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value;
}

const FIELD_LABEL: Record<WorkflowStateChange['field'], string> = {
  kycStatus: 'KYC status',
  idVerificationDate: 'ID verification date',
  documentationComplete: 'Documentation complete',
  relationshipManager: 'Relationship manager',
};

interface AmendmentRowProps {
  readonly amendment: AmendmentEntry;
}

function AmendmentRow({ amendment }: AmendmentRowProps) {
  return (
    <li className="flex flex-col gap-2 py-3 border-b border-neutral/10 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-body font-medium">{amendment.actor}</span>
        <span className="text-label tabular">{formatDateTime(amendment.at)}</span>
      </div>
      <p className="m-0 text-body italic text-neutral">{amendment.reason}</p>
      <ul className="m-0 p-0 list-none flex flex-col gap-1">
        {amendment.changes.map((change, index) => (
          <li key={`${change.field}-${index}`} className="text-body">
            <span className="text-label">{FIELD_LABEL[change.field]}: </span>
            <span className="tabular">
              {formatChangeValue(change.previousValue)} → {formatChangeValue(change.newValue)}
            </span>
          </li>
        ))}
      </ul>
    </li>
  );
}

interface AuditTrailPanelProps {
  readonly record: ClientRecord;
}

export function AuditTrailPanel({ record }: AuditTrailPanelProps) {
  const amendments = record.amendments ?? [];
  const newestFirst = [...amendments].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Amendment log</CardTitle>
      </CardHeader>
      <CardContent>
        {newestFirst.length === 0 ? (
          <p className="m-0 text-body text-neutral">
            No amendments — original record.
          </p>
        ) : (
          <ul className="m-0 p-0 list-none flex flex-col">
            {newestFirst.map((amendment) => (
              <AmendmentRow key={amendment.id} amendment={amendment} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
