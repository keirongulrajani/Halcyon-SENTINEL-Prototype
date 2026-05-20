import { forwardRef, type HTMLAttributes } from 'react';
import { Badge, type BadgeProps } from '@/ui/components/badge';
import type { FindingSeverity } from '@/domain/types';

type SeverityVariant = NonNullable<BadgeProps['variant']>;

const SEVERITY_TO_VARIANT: Record<FindingSeverity, SeverityVariant> = {
  CLASSIFICATION_MISMATCH: 'high',
  WORKFLOW_VIOLATION: 'medium',
  MISSING_FIELD: 'neutral',
};

const SEVERITY_TO_LABEL: Record<FindingSeverity, string> = {
  CLASSIFICATION_MISMATCH: 'Classification mismatch',
  WORKFLOW_VIOLATION: 'Workflow violation',
  MISSING_FIELD: 'Missing field',
};

export interface FindingSeverityBadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  severity: FindingSeverity;
}

const FindingSeverityBadge = forwardRef<HTMLSpanElement, FindingSeverityBadgeProps>(
  ({ severity, ...props }, ref) => (
    <Badge ref={ref} variant={SEVERITY_TO_VARIANT[severity]} {...props}>
      {SEVERITY_TO_LABEL[severity]}
    </Badge>
  ),
);
FindingSeverityBadge.displayName = 'FindingSeverityBadge';

export { FindingSeverityBadge };
