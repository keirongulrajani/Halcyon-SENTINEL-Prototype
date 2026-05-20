import { AlertCircle } from 'lucide-react';
import { cn } from './utils';

interface MissingFieldIndicatorProps {
  readonly fieldLabel: string;
  readonly className?: string;
}

export function MissingFieldIndicator({ fieldLabel, className }: MissingFieldIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-error',
        'text-body tabular',
        className,
      )}
      role="status"
      aria-label={`${fieldLabel} is missing`}
      title={`${fieldLabel} is missing — this is a regulatory finding`}
    >
      <AlertCircle className="size-4" aria-hidden="true" />
      <span>Missing</span>
    </span>
  );
}
