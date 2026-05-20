import { AlertTriangle } from 'lucide-react';
import { cn } from '@/ui/components/utils';
import type { ImportPreview } from '@/application/import-service';

export type Tone = 'success' | 'warning' | 'error';

const TONE_STYLES: Record<Tone, string> = {
  success: 'text-success bg-success-tint',
  warning: 'text-warning bg-warning-tint',
  error: 'text-error bg-error-tint',
};

interface KpiTileProps {
  readonly label: string;
  readonly value: number;
  readonly tone: Tone;
}

export function KpiTile({ label, value, tone }: KpiTileProps) {
  return (
    <div className={cn('surface-card p-4 flex flex-col gap-1 border border-neutral/15', TONE_STYLES[tone])}>
      <span className="text-kpi tabular">{value}</span>
      <span className="text-label">{label}</span>
    </div>
  );
}

export function MissingHeadersBanner({ headers }: { readonly headers: readonly string[] }) {
  return (
    <section
      role="alert"
      className="surface-card border-l-4 border-error p-4 flex flex-col gap-2 bg-error-tint"
    >
      <header className="flex items-center gap-2">
        <AlertTriangle className="size-5 text-error" aria-hidden="true" />
        <h3 className="text-h2 text-error">Incompatible file structure</h3>
      </header>
      <p className="text-body">
        The file is missing required columns and cannot be imported. Add the
        following headers and try again.
      </p>
      <ul className="flex flex-wrap gap-2 m-0 p-0 list-none">
        {headers.map((header) => (
          <li key={header} className="text-label tabular bg-card border border-error/30 rounded-md px-2 py-1">
            {header}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FailuresList({ failures }: { readonly failures: ImportPreview['failures'] }) {
  return (
    <details className="flex flex-col gap-2" open>
      <summary className="text-h2 cursor-pointer select-none">
        Invalid rows ({failures.length})
      </summary>
      <ul className="flex flex-col gap-2 m-0 p-0 list-none">
        {failures.map((failure) => (
          <li
            key={`${failure.rowNumber}-${failure.clientId ?? 'unknown'}`}
            className="surface-card p-3 border-l-4 border-error flex flex-col gap-1"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-label tabular">Row {failure.rowNumber}</span>
              {failure.clientId !== null && (
                <span className="text-label text-text tabular">{failure.clientId}</span>
              )}
            </div>
            <ul className="flex flex-col gap-1 m-0 pl-4 list-disc">
              {failure.issues.map((issue, index) => (
                <li key={`${failure.rowNumber}-${issue.field}-${index}`} className="text-body">
                  <span className="text-label">{issue.field}:</span> {issue.message}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function DuplicatesList({ duplicates }: { readonly duplicates: ImportPreview['duplicates'] }) {
  return (
    <details className="flex flex-col gap-2">
      <summary className="text-h2 cursor-pointer select-none">
        Duplicates ({duplicates.length})
      </summary>
      <ul className="flex flex-col gap-1 m-0 p-0 list-none">
        {duplicates.map((duplicate) => (
          <li
            key={`${duplicate.rowNumber}-${duplicate.clientId}`}
            className="text-body tabular flex gap-3 px-3 py-2 border-t border-neutral/15 first:border-t-0"
          >
            <span className="text-label">Row {duplicate.rowNumber}</span>
            <span>{duplicate.clientId}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
