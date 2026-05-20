import { AlertTriangle } from 'lucide-react';
import type { Finding } from '@/domain/types';
import { FindingSeverityBadge } from './finding-severity-badge';
import { cn } from './utils';

interface FindingsBannerProps {
  readonly findings: readonly Finding[];
  readonly className?: string;
}

const SEVERITY_LABEL = {
  CLASSIFICATION_MISMATCH: 'Classification mismatch',
  WORKFLOW_VIOLATION: 'Workflow violation',
  MISSING_FIELD: 'Missing required field',
} as const;

export function FindingsBanner({ findings, className }: FindingsBannerProps) {
  if (findings.length === 0) return null;

  return (
    <section
      role="alert"
      aria-label={`${findings.length} data integrity finding${findings.length === 1 ? '' : 's'}`}
      className={cn(
        'surface-card border-l-4 border-error',
        'p-4 flex flex-col gap-3',
        className,
      )}
    >
      <header className="flex items-center gap-2">
        <AlertTriangle className="size-5 text-error" aria-hidden="true" />
        <h2 className="text-h2 text-error">
          {findings.length} data integrity {findings.length === 1 ? 'finding' : 'findings'}
        </h2>
      </header>
      <ul className="flex flex-col gap-2 m-0 p-0 list-none">
        {findings.map((finding) => (
          <li key={finding.id} className="flex flex-col gap-1 pl-3 border-l-2 border-error/30">
            <div className="flex items-center gap-2">
              <FindingSeverityBadge severity={finding.severity} />
              <span className="text-label">{SEVERITY_LABEL[finding.severity]}</span>
            </div>
            <p className="text-body m-0">{finding.detail}</p>
            <p className="text-label text-neutral m-0">
              <strong className="font-medium">Recommended action:</strong>{' '}
              {finding.recommendedAction}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
