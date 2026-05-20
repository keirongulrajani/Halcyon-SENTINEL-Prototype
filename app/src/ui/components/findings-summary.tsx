import { useState } from 'react';
import { AlertOctagon, ChevronDown, ChevronRight, FileWarning, ShieldAlert } from 'lucide-react';
import type { Finding, FindingSeverity } from '@/domain/types';
import { cn } from './utils';

const SEVERITY_PRESENTATION: Record<
  FindingSeverity,
  { readonly label: string; readonly tone: string; readonly accent: string; readonly icon: React.ReactNode }
> = {
  CLASSIFICATION_MISMATCH: {
    label: 'Mismatch',
    tone: 'bg-error/10 text-error border-error/30',
    accent: 'border-error',
    icon: <AlertOctagon className="size-3" aria-hidden="true" />,
  },
  WORKFLOW_VIOLATION: {
    label: 'Workflow',
    tone: 'bg-warning/10 text-warning border-warning/30',
    accent: 'border-warning',
    icon: <ShieldAlert className="size-3" aria-hidden="true" />,
  },
  MISSING_FIELD: {
    label: 'Missing field',
    tone: 'bg-primary/10 text-primary border-primary/30',
    accent: 'border-primary',
    icon: <FileWarning className="size-3" aria-hidden="true" />,
  },
};

interface FindingsSummaryProps {
  readonly findings: readonly Finding[];
  readonly className?: string;
}

export function FindingsSummary({ findings, className }: FindingsSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (findings.length === 0) {
    return <span className="text-neutral text-body">—</span>;
  }

  const orderedSeverities: FindingSeverity[] = [];
  const seen = new Set<FindingSeverity>();
  for (const finding of findings) {
    if (!seen.has(finding.severity)) {
      seen.add(finding.severity);
      orderedSeverities.push(finding.severity);
    }
  }

  return (
    <div className={cn('flex flex-col gap-2 items-start', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Hide finding details' : 'Show finding details'}
        className="inline-flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary rounded-card"
      >
        {isExpanded ? (
          <ChevronDown className="size-4 text-neutral" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-4 text-neutral" aria-hidden="true" />
        )}
        <span className="flex flex-wrap gap-1">
          {orderedSeverities.map((severity) => {
            const presentation = SEVERITY_PRESENTATION[severity];
            const countForSeverity = findings.filter((finding) => finding.severity === severity).length;
            return (
              <span
                key={severity}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-label',
                  presentation.tone,
                )}
              >
                {presentation.icon}
                <span>
                  {presentation.label}
                  {countForSeverity > 1 && <span className="tabular"> ×{countForSeverity}</span>}
                </span>
              </span>
            );
          })}
        </span>
      </button>
      {isExpanded && (
        <ul className="m-0 p-0 list-none flex flex-col gap-2 w-full max-w-md">
          {findings.map((finding) => {
            const presentation = SEVERITY_PRESENTATION[finding.severity];
            return (
              <li
                key={finding.id}
                className={cn(
                  'p-2 border-l-2 bg-background rounded-r-card',
                  presentation.accent,
                )}
              >
                <p className="m-0 text-label">{finding.rule}</p>
                <p className="m-0 text-body mt-1">{finding.detail}</p>
                <p className="m-0 text-label text-neutral mt-1">
                  <strong className="font-medium">Action:</strong> {finding.recommendedAction}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
